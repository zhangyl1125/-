package wtf.hackhub.application.idea;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import wtf.hackhub.domain.Idea;
import wtf.hackhub.domain.IdeaVote;
import wtf.hackhub.domain.Profile;
import wtf.hackhub.domain.VotingParticipant;
import wtf.hackhub.infrastructure.persistence.IdeaMutationLock;
import wtf.hackhub.infrastructure.persistence.auth.ProfileRepository;
import wtf.hackhub.infrastructure.persistence.idea.IdeaRepository;
import wtf.hackhub.infrastructure.persistence.idea.IdeaVoteRepository;
import wtf.hackhub.infrastructure.persistence.idea.VotingParticipantRepository;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Toggle vote on an idea (vote/unvote). Replaces the broken ideaService.ts
 * voteIdea() which was disabled due to 406 errors. The votes counter on Idea is
 * maintained by a DB trigger (fn_update_idea_vote_count).
 */
@Service
public class VoteIdeaUseCase {
	private final IdeaMutationLock mutationLock;
	private static final int MAX_VOTES_PER_TRACK = 4;
	private static final int MAX_OWN_DEPARTMENT_VOTES_PER_TRACK = 2;
	private static final Pattern NAME_TOKEN = Pattern.compile("[a-z0-9]+");

	private final IdeaRepository ideaRepository;
	private final IdeaVoteRepository voteRepository;
	private final ProfileRepository profileRepository;
	private final VotingParticipantRepository participantRepository;

	public VoteIdeaUseCase(IdeaRepository ideaRepository, IdeaVoteRepository voteRepository,
			ProfileRepository profileRepository, VotingParticipantRepository participantRepository, IdeaMutationLock mutationLock) {
		this.ideaRepository = ideaRepository;
		this.mutationLock = mutationLock;
		this.voteRepository = voteRepository;
		this.profileRepository = profileRepository;
		this.participantRepository = participantRepository;
	}

	public record Result(boolean voted, long voteCount) {
	}

	@Transactional
	public Result execute(UUID ideaId, UUID userId) {
		mutationLock.acquire(ideaId);
		Idea idea = ideaRepository.findById(ideaId).orElseThrow(() -> new IdeaNotFoundException(ideaId));
		Profile voterProfile = profileRepository.findByIdForUpdate(userId)
				.orElseThrow(() -> new ParticipantNotEligibleException(userId));

		Optional<IdeaVote> existing = voteRepository.findByIdeaIdAndUserId(ideaId, userId);

		if (existing.isPresent()) {
			// Toggle off
			voteRepository.delete(existing.get());
			long count = voteRepository.countByIdeaId(ideaId);
			return new Result(false, count);
		}

		VotingParticipant voter = resolveParticipant(voterProfile)
				.orElseThrow(() -> new ParticipantNotEligibleException(userId));
		List<IdeaVote> currentVotes = voteRepository.findAllByUserIdAndHackathonId(userId, idea.getHackathonId());
		List<Idea> currentTrackIdeas = currentVotes.stream().map(IdeaVote::getIdeaId).map(ideaRepository::findById)
				.flatMap(Optional::stream).filter(votedIdea -> idea.getCategory().equalsIgnoreCase(votedIdea.getCategory()))
				.toList();
		if (currentTrackIdeas.size() >= MAX_VOTES_PER_TRACK) {
			throw new VoteLimitExceededException(MAX_VOTES_PER_TRACK);
		}

		VotingParticipant projectOwner = resolveProjectOwner(idea);
		String voterDepartment = departmentCode(voter.getOrganizationalUnit());
		String projectDepartment = departmentCode(projectOwner.getOrganizationalUnit());
		if (voterDepartment.equalsIgnoreCase(projectDepartment)) {
			long ownDepartmentVotes = currentTrackIdeas.stream().map(this::resolveProjectOwner)
					.map(VotingParticipant::getOrganizationalUnit)
					.map(VoteIdeaUseCase::departmentCode).filter(voterDepartment::equalsIgnoreCase).count();
			if (ownDepartmentVotes >= MAX_OWN_DEPARTMENT_VOTES_PER_TRACK) {
				throw new OwnDepartmentVoteLimitExceededException(voterDepartment,
						MAX_OWN_DEPARTMENT_VOTES_PER_TRACK);
			}
		}

		voteRepository.save(new IdeaVote(ideaId, userId));
		long count = voteRepository.countByIdeaId(ideaId);
		return new Result(true, count);
	}

	private VotingParticipant resolveProjectOwner(Idea idea) {
		Profile profile = profileRepository.findById(nomineeId(idea))
				.orElseThrow(() -> new ProjectDepartmentUnknownException(idea.getId()));
		return resolveParticipant(profile).orElseThrow(() -> new ProjectDepartmentUnknownException(idea.getId()));
	}

	static UUID nomineeId(Idea idea) {
		if (idea.getProjectAttachments() == null || idea.getProjectAttachments().isBlank()) return idea.getCreatedBy();
		try {
			var attachments = new ObjectMapper().readTree(idea.getProjectAttachments());
			for (var attachment : attachments) {
				if ("nomination".equals(attachment.path("type").asText()) && attachment.hasNonNull("nomineeUserId")) {
					return UUID.fromString(attachment.get("nomineeUserId").asText());
				}
			}
		} catch (Exception ex) {
			throw new ProjectDepartmentUnknownException(idea.getId());
		}
		return idea.getCreatedBy();
	}

	private Optional<VotingParticipant> resolveParticipant(Profile profile) {
		String emailLocalPart = profile.getEmail().split("@", 2)[0].replaceFirst("(?i)^fixed-term[._-]*", "");
		Optional<VotingParticipant> byEmail = uniqueParticipant(normalizeIdentity(emailLocalPart));
		if (byEmail.isPresent())
			return byEmail;

		Optional<VotingParticipant> byName = uniqueParticipant(normalizeIdentity(profile.getName()));
		if (byName.isPresent())
			return byName;

		// Platform administrators need to verify the voting flow even when they are
		// not members of the imported BD roster. Keep them in one explicit virtual
		// department so the same 4-vote total and 2-vote own-department limits still
		// apply. Non-admin accounts must continue to match the roster uniquely.
		if (profile.getRole() == Profile.Role.ADMIN) {
			return Optional.of(new VotingParticipant("admin:" + profile.getEmail(), "ADMIN", profile.getName(),
					normalizeIdentity(profile.getName())));
		}

		return Optional.empty();
	}

	private Optional<VotingParticipant> uniqueParticipant(String normalizedName) {
		if (normalizedName.isBlank())
			return Optional.empty();
		List<VotingParticipant> matches = participantRepository.findAllByNormalizedName(normalizedName);
		return matches.size() == 1 ? Optional.of(matches.get(0)) : Optional.empty();
	}

	static String normalizeIdentity(String value) {
		int slash = value.lastIndexOf('/');
		String englishName = slash >= 0 ? value.substring(slash + 1) : value;
		Matcher matcher = NAME_TOKEN.matcher(englishName.toLowerCase(Locale.ROOT));
		List<String> tokens = matcher.results().map(result -> result.group()).filter(token -> !token.equals("mr"))
				.filter(token -> !token.equals("ms")).filter(token -> !token.equals("mrs"))
				.filter(token -> !token.equals("dr")).sorted(Comparator.naturalOrder()).toList();
		return tokens.stream().collect(Collectors.joining());
	}

	static String departmentCode(String organizationalUnit) {
		int separator = organizationalUnit.indexOf('-');
		return separator < 0 ? organizationalUnit : organizationalUnit.substring(0, separator);
	}

	public static class IdeaNotFoundException extends RuntimeException {
		public IdeaNotFoundException(UUID id) {
			super("Idea not found: " + id);
		}
	}

	public static class ParticipantNotEligibleException extends RuntimeException {
		public ParticipantNotEligibleException(UUID userId) {
			super("User is not uniquely matched to the BD participant roster: " + userId);
		}
	}

	public static class ProjectDepartmentUnknownException extends RuntimeException {
		public ProjectDepartmentUnknownException(UUID ideaId) {
			super("Project owner is not uniquely matched to the BD participant roster: " + ideaId);
		}
	}

	public static class VoteLimitExceededException extends RuntimeException {
		public VoteLimitExceededException(int limit) {
			super("Each participant can cast at most " + limit + " votes per award category.");
		}
	}

	public static class OwnDepartmentVoteLimitExceededException extends RuntimeException {
		public OwnDepartmentVoteLimitExceededException(String department, int limit) {
			super("At most " + limit + " votes may be cast for projects from your department (" + department + ").");
		}
	}
}
