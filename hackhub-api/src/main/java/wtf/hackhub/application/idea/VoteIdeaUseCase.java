package wtf.hackhub.application.idea;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import wtf.hackhub.domain.Idea;
import wtf.hackhub.domain.IdeaVote;
import wtf.hackhub.domain.Profile;
import wtf.hackhub.domain.VotingParticipant;
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
	private static final int MAX_VOTES_PER_HACKATHON = 4;
	private static final int MAX_OWN_DEPARTMENT_VOTES = 2;
	private static final Pattern NAME_TOKEN = Pattern.compile("[a-z0-9]+");

	private final IdeaRepository ideaRepository;
	private final IdeaVoteRepository voteRepository;
	private final ProfileRepository profileRepository;
	private final VotingParticipantRepository participantRepository;

	public VoteIdeaUseCase(IdeaRepository ideaRepository, IdeaVoteRepository voteRepository,
			ProfileRepository profileRepository, VotingParticipantRepository participantRepository) {
		this.ideaRepository = ideaRepository;
		this.voteRepository = voteRepository;
		this.profileRepository = profileRepository;
		this.participantRepository = participantRepository;
	}

	public record Result(boolean voted, long voteCount) {
	}

	@Transactional
	public Result execute(UUID ideaId, UUID userId) {
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
		if (currentVotes.size() >= MAX_VOTES_PER_HACKATHON) {
			throw new VoteLimitExceededException(MAX_VOTES_PER_HACKATHON);
		}

		VotingParticipant projectOwner = resolveProjectOwner(idea);
		String voterDepartment = departmentCode(voter.getOrganizationalUnit());
		String projectDepartment = departmentCode(projectOwner.getOrganizationalUnit());
		if (voterDepartment.equalsIgnoreCase(projectDepartment)) {
			long ownDepartmentVotes = currentVotes.stream().map(IdeaVote::getIdeaId).map(ideaRepository::findById)
					.flatMap(Optional::stream).map(this::resolveProjectOwner).map(VotingParticipant::getOrganizationalUnit)
					.map(VoteIdeaUseCase::departmentCode).filter(voterDepartment::equalsIgnoreCase).count();
			if (ownDepartmentVotes >= MAX_OWN_DEPARTMENT_VOTES) {
				throw new OwnDepartmentVoteLimitExceededException(voterDepartment, MAX_OWN_DEPARTMENT_VOTES);
			}
		}

		voteRepository.save(new IdeaVote(ideaId, userId));
		long count = voteRepository.countByIdeaId(ideaId);
		return new Result(true, count);
	}

	private VotingParticipant resolveProjectOwner(Idea idea) {
		Profile profile = profileRepository.findById(idea.getCreatedBy())
				.orElseThrow(() -> new ProjectDepartmentUnknownException(idea.getId()));
		return resolveParticipant(profile).orElseThrow(() -> new ProjectDepartmentUnknownException(idea.getId()));
	}

	private Optional<VotingParticipant> resolveParticipant(Profile profile) {
		Optional<VotingParticipant> byName = uniqueParticipant(normalizeIdentity(profile.getName()));
		if (byName.isPresent())
			return byName;

		String emailLocalPart = profile.getEmail().split("@", 2)[0].replaceFirst("(?i)^fixed-term[._-]*", "");
		return uniqueParticipant(normalizeIdentity(emailLocalPart));
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
			super("Each participant can cast at most " + limit + " votes per hackathon.");
		}
	}

	public static class OwnDepartmentVoteLimitExceededException extends RuntimeException {
		public OwnDepartmentVoteLimitExceededException(String department, int limit) {
			super("At most " + limit + " votes may be cast for projects from your department (" + department + ").");
		}
	}
}
