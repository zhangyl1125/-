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

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Toggle vote on an idea (vote/unvote). Replaces the broken ideaService.ts
 * voteIdea() which was disabled due to 406 errors. The votes counter on Idea is
 * maintained by a DB trigger (fn_update_idea_vote_count).
 */
@Service
public class VoteIdeaUseCase {
	private final IdeaMutationLock mutationLock;
	@org.springframework.beans.factory.annotation.Value("${app.voting.max-votes-per-track:4}")
	private int maxVotesPerTrack = 4;

	private final NomineeDirectory directory;

	private final IdeaRepository ideaRepository;
	private final IdeaVoteRepository voteRepository;
	private final ProfileRepository profileRepository;

	public VoteIdeaUseCase(IdeaRepository ideaRepository, IdeaVoteRepository voteRepository,
			ProfileRepository profileRepository, NomineeDirectory directory, IdeaMutationLock mutationLock) {
		this.ideaRepository = ideaRepository;
		this.mutationLock = mutationLock;
		this.voteRepository = voteRepository;
		this.profileRepository = profileRepository;
		this.directory = directory;
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

		VotingParticipant voter = directory.resolveParticipant(voterProfile)
				.orElseThrow(() -> new ParticipantNotEligibleException(userId));
		List<IdeaVote> currentVotes = voteRepository.findAllByUserIdAndHackathonId(userId, idea.getHackathonId());
		List<Idea> currentTrackIdeas = currentVotes.stream()
				.filter(vote -> existing.isEmpty() || !vote.getIdeaId().equals(ideaId)).map(IdeaVote::getIdeaId)
				.map(ideaRepository::findById).flatMap(Optional::stream)
				.filter(votedIdea -> track(idea).equals(track(votedIdea))).toList();
		if (existing.isEmpty() && currentTrackIdeas.size() >= maxVotesPerTrack) {
			throw new VoteLimitExceededException(maxVotesPerTrack);
		}
		String voterDepartment = departmentCode(voter.getOrganizationalUnit());
		long ownVotes = currentTrackIdeas.stream().map(this::resolveProjectOwner)
				.map(VotingParticipant::getOrganizationalUnit).map(VoteIdeaUseCase::departmentCode)
				.filter(voterDepartment::equalsIgnoreCase).count();
		int resultingTotal = currentTrackIdeas.size();
		if (existing.isEmpty()) {
			resultingTotal++;
			if (voterDepartment.equalsIgnoreCase(departmentCode(resolveProjectOwner(idea).getOrganizationalUnit())))
				ownVotes++;
		}
		if (ownVotes * 2 > resultingTotal) {
			throw new IllegalArgumentException(existing.isPresent()
					? "Keep at least 50% of your votes outside your department. Remove a same-department vote first."
					: "At least 50% of your votes must go outside your department. Vote for another department first.");
		}
		if (existing.isPresent()) {
			voteRepository.delete(existing.get());
			return new Result(false, voteRepository.countByIdeaId(ideaId));
		}

		voteRepository.save(new IdeaVote(ideaId, userId));
		long count = voteRepository.countByIdeaId(ideaId);
		return new Result(true, count);
	}

	/**
	 * Explicitly reset a user's track, including invalid ballots left by older
	 * rules.
	 */
	@Transactional
	public void clearTrack(UUID hackathonId, UUID userId, String category) {
		if (category == null || category.isBlank())
			throw new IllegalArgumentException("An award category is required");
		profileRepository.findByIdForUpdate(userId).orElseThrow(() -> new ParticipantNotEligibleException(userId));
		var selected = voteRepository
				.findAllByUserIdAndHackathonId(userId,
						hackathonId)
				.stream()
				.filter(vote -> ideaRepository.findById(vote.getIdeaId()).map(idea -> wtf.hackhub.domain.AwardTrack
						.normalize(category, java.util.List.of()).equals(track(idea))).orElse(false))
				.toList();
		voteRepository.deleteAll(selected);
	}

	/** Reset the signed-in user's entire ballot atomically, under the same voter lock as toggle. */
	@Transactional
	public void clearAll(UUID userId) {
		profileRepository.findByIdForUpdate(userId).orElseThrow(() -> new ParticipantNotEligibleException(userId));
		voteRepository.deleteAll(voteRepository.findAllByUserId(userId));
	}

	private static String track(Idea idea) {
		return wtf.hackhub.domain.AwardTrack.normalize(idea.getCategory(), idea.getTags());
	}

	private VotingParticipant resolveProjectOwner(Idea idea) {
		Profile profile = profileRepository.findById(nomineeId(idea))
				.orElseThrow(() -> new ProjectDepartmentUnknownException(idea.getId()));
		return directory.resolveParticipant(profile)
				.orElseThrow(() -> new ProjectDepartmentUnknownException(idea.getId()));
	}

	static UUID nomineeId(Idea idea) {
		if (idea.getProjectAttachments() == null || idea.getProjectAttachments().isBlank())
			return idea.getCreatedBy();
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

	static String normalizeIdentity(String value) {
		return NomineeDirectory.normalizeIdentity(value);
	}
	static String departmentCode(String value) {
		return NomineeDirectory.departmentCode(value);
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
