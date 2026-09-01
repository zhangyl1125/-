package wtf.hackhub.application.idea;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import wtf.hackhub.domain.Idea;
import wtf.hackhub.domain.IdeaVote;
import wtf.hackhub.domain.Profile;
import wtf.hackhub.domain.VotingParticipant;
import wtf.hackhub.infrastructure.persistence.auth.ProfileRepository;
import wtf.hackhub.infrastructure.persistence.idea.IdeaRepository;
import wtf.hackhub.infrastructure.persistence.idea.IdeaVoteRepository;
import wtf.hackhub.infrastructure.persistence.idea.VotingParticipantRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VoteIdeaUseCaseTest {

	@Mock
	IdeaRepository ideaRepository;
	@Mock
	IdeaVoteRepository voteRepository;
	@Mock
	ProfileRepository profileRepository;
	@Mock
	VotingParticipantRepository participantRepository;
	@InjectMocks
	VoteIdeaUseCase useCase;

	private Idea idea(UUID id) {
		return new Idea("Title", "Desc", UUID.randomUUID(), null, UUID.randomUUID(), "tech");
	}

	private Profile profile(String name) {
		return new Profile(name.toLowerCase().replace(' ', '.') + "@bosch.com", name, "hash");
	}

	private Profile adminProfile(String email, String name) {
		Profile profile = new Profile(email, name, "hash");
		profile.changeRole(Profile.Role.ADMIN);
		return profile;
	}

	private void allowVoting(Idea idea, UUID userId, String voterUnit, String projectUnit) {
		when(profileRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(profile("WANG Alice")));
		when(profileRepository.findById(idea.getCreatedBy()))
				.thenReturn(Optional.of(profile("CHEN Bob")));
		when(participantRepository.findAllByNormalizedName("alicewang"))
				.thenReturn(List.of(new VotingParticipant("1", voterUnit, "WANG Alice", "alicewang")));
		when(participantRepository.findAllByNormalizedName("bobchen"))
				.thenReturn(List.of(new VotingParticipant("2", projectUnit, "CHEN Bob", "bobchen")));
	}

	@Test
	void voting_creates_new_vote_and_returns_voted_true() {
		UUID ideaId = UUID.randomUUID();
		UUID userId = UUID.randomUUID();

		Idea idea = idea(ideaId);
		when(ideaRepository.findById(ideaId)).thenReturn(Optional.of(idea));
		when(voteRepository.findByIdeaIdAndUserId(ideaId, userId)).thenReturn(Optional.empty());
		allowVoting(idea, userId, "BD/SWD-ARC2", "BD/TOA-GTC6");
		when(voteRepository.findAllByUserIdAndHackathonId(userId, idea.getHackathonId())).thenReturn(List.of());
		when(voteRepository.save(any())).thenAnswer(i -> i.getArgument(0));
		when(voteRepository.countByIdeaId(ideaId)).thenReturn(1L);

		VoteIdeaUseCase.Result result = useCase.execute(ideaId, userId);

		assertThat(result.voted()).isTrue();
		assertThat(result.voteCount()).isEqualTo(1L);
		verify(voteRepository).save(any(IdeaVote.class));
		verify(voteRepository, never()).delete(any());
	}

	@Test
	void voting_again_removes_vote_and_returns_voted_false() {
		UUID ideaId = UUID.randomUUID();
		UUID userId = UUID.randomUUID();
		IdeaVote existing = new IdeaVote(ideaId, userId);

		when(ideaRepository.findById(ideaId)).thenReturn(Optional.of(idea(ideaId)));
		when(profileRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(profile("WANG Alice")));
		when(voteRepository.findByIdeaIdAndUserId(ideaId, userId)).thenReturn(Optional.of(existing));
		when(voteRepository.countByIdeaId(ideaId)).thenReturn(0L);

		VoteIdeaUseCase.Result result = useCase.execute(ideaId, userId);

		assertThat(result.voted()).isFalse();
		assertThat(result.voteCount()).isEqualTo(0L);
		verify(voteRepository).delete(existing);
		verify(voteRepository, never()).save(any());
	}

	@Test
	void throws_not_found_for_unknown_idea() {
		when(ideaRepository.findById(any())).thenReturn(Optional.empty());
		assertThatThrownBy(() -> useCase.execute(UUID.randomUUID(), UUID.randomUUID()))
				.isInstanceOf(VoteIdeaUseCase.IdeaNotFoundException.class);
	}

	@Test
	void rejects_fifth_vote_in_same_hackathon() {
		UUID ideaId = UUID.randomUUID();
		UUID userId = UUID.randomUUID();
		Idea idea = idea(ideaId);
		when(ideaRepository.findById(ideaId)).thenReturn(Optional.of(idea));
		when(voteRepository.findByIdeaIdAndUserId(ideaId, userId)).thenReturn(Optional.empty());
		when(profileRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(profile("WANG Alice")));
		when(participantRepository.findAllByNormalizedName("alicewang"))
				.thenReturn(List.of(new VotingParticipant("1", "BD/SWD-ARC2", "WANG Alice", "alicewang")));
		when(voteRepository.findAllByUserIdAndHackathonId(userId, idea.getHackathonId()))
				.thenReturn(List.of(new IdeaVote(UUID.randomUUID(), userId), new IdeaVote(UUID.randomUUID(), userId),
						new IdeaVote(UUID.randomUUID(), userId), new IdeaVote(UUID.randomUUID(), userId)));

		assertThatThrownBy(() -> useCase.execute(ideaId, userId))
				.isInstanceOf(VoteIdeaUseCase.VoteLimitExceededException.class).hasMessageContaining("at most 4");
		verify(voteRepository, never()).save(any());
	}

	@Test
	void rejects_third_vote_for_own_department() {
		UUID ideaId = UUID.randomUUID();
		UUID userId = UUID.randomUUID();
		Idea target = idea(ideaId);
		Idea previousOne = idea(UUID.randomUUID());
		Idea previousTwo = idea(UUID.randomUUID());
		IdeaVote voteOne = new IdeaVote(UUID.randomUUID(), userId);
		IdeaVote voteTwo = new IdeaVote(UUID.randomUUID(), userId);

		when(ideaRepository.findById(ideaId)).thenReturn(Optional.of(target));
		when(voteRepository.findByIdeaIdAndUserId(ideaId, userId)).thenReturn(Optional.empty());
		allowVoting(target, userId, "BD/SWD-ARC2", "BD/SWD-BEA5");
		when(voteRepository.findAllByUserIdAndHackathonId(userId, target.getHackathonId()))
				.thenReturn(List.of(voteOne, voteTwo));
		when(ideaRepository.findById(voteOne.getIdeaId())).thenReturn(Optional.of(previousOne));
		when(ideaRepository.findById(voteTwo.getIdeaId())).thenReturn(Optional.of(previousTwo));
		when(profileRepository.findById(previousOne.getCreatedBy())).thenReturn(Optional.of(profile("CHEN Bob")));
		when(profileRepository.findById(previousTwo.getCreatedBy())).thenReturn(Optional.of(profile("CHEN Bob")));

		assertThatThrownBy(() -> useCase.execute(ideaId, userId))
				.isInstanceOf(VoteIdeaUseCase.OwnDepartmentVoteLimitExceededException.class)
				.hasMessageContaining("BD/SWD");
		verify(voteRepository, never()).save(any());
	}

	@Test
	void permits_four_votes_outside_own_department() {
		UUID ideaId = UUID.randomUUID();
		UUID userId = UUID.randomUUID();
		Idea target = idea(ideaId);
		when(ideaRepository.findById(ideaId)).thenReturn(Optional.of(target));
		when(voteRepository.findByIdeaIdAndUserId(ideaId, userId)).thenReturn(Optional.empty());
		allowVoting(target, userId, "BD/SWD-ARC2", "BD/TOA-GTC6");
		when(voteRepository.findAllByUserIdAndHackathonId(userId, target.getHackathonId()))
				.thenReturn(List.of(new IdeaVote(UUID.randomUUID(), userId), new IdeaVote(UUID.randomUUID(), userId),
						new IdeaVote(UUID.randomUUID(), userId)));
		when(voteRepository.countByIdeaId(ideaId)).thenReturn(1L);

		assertThat(useCase.execute(ideaId, userId).voted()).isTrue();
		verify(voteRepository).save(any(IdeaVote.class));
	}

	@Test
	void rejects_user_not_in_bd_roster() {
		UUID ideaId = UUID.randomUUID();
		UUID userId = UUID.randomUUID();
		Idea idea = idea(ideaId);
		when(ideaRepository.findById(ideaId)).thenReturn(Optional.of(idea));
		when(profileRepository.findByIdForUpdate(userId))
				.thenReturn(Optional.of(new Profile("unknown@bosch.com", "Unknown User", "hash")));
		when(voteRepository.findByIdeaIdAndUserId(ideaId, userId)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> useCase.execute(ideaId, userId))
				.isInstanceOf(VoteIdeaUseCase.ParticipantNotEligibleException.class);
	}

	@Test
	void permits_non_roster_admin_to_vote_without_bypassing_vote_rules() {
		UUID ideaId = UUID.randomUUID();
		UUID userId = UUID.randomUUID();
		Idea target = idea(ideaId);
		Profile admin = adminProfile("aah5sgh@bosch.com", "Yaolong.Zhang");
		when(ideaRepository.findById(ideaId)).thenReturn(Optional.of(target));
		when(profileRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(admin));
		when(voteRepository.findByIdeaIdAndUserId(ideaId, userId)).thenReturn(Optional.empty());
		when(voteRepository.findAllByUserIdAndHackathonId(userId, target.getHackathonId())).thenReturn(List.of());
		when(profileRepository.findById(target.getCreatedBy())).thenReturn(Optional.of(admin));
		when(voteRepository.countByIdeaId(ideaId)).thenReturn(1L);

		VoteIdeaUseCase.Result result = useCase.execute(ideaId, userId);

		assertThat(result.voted()).isTrue();
		verify(voteRepository).save(any(IdeaVote.class));
	}

	@Test
	void applies_same_department_limit_to_non_roster_admin_projects() {
		UUID ideaId = UUID.randomUUID();
		UUID userId = UUID.randomUUID();
		Idea target = idea(ideaId);
		Idea previousOne = idea(UUID.randomUUID());
		Idea previousTwo = idea(UUID.randomUUID());
		IdeaVote voteOne = new IdeaVote(UUID.randomUUID(), userId);
		IdeaVote voteTwo = new IdeaVote(UUID.randomUUID(), userId);
		Profile admin = adminProfile("aah5sgh@bosch.com", "Yaolong.Zhang");

		when(ideaRepository.findById(ideaId)).thenReturn(Optional.of(target));
		when(profileRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(admin));
		when(voteRepository.findByIdeaIdAndUserId(ideaId, userId)).thenReturn(Optional.empty());
		when(voteRepository.findAllByUserIdAndHackathonId(userId, target.getHackathonId()))
				.thenReturn(List.of(voteOne, voteTwo));
		when(ideaRepository.findById(voteOne.getIdeaId())).thenReturn(Optional.of(previousOne));
		when(ideaRepository.findById(voteTwo.getIdeaId())).thenReturn(Optional.of(previousTwo));
		when(profileRepository.findById(target.getCreatedBy())).thenReturn(Optional.of(admin));
		when(profileRepository.findById(previousOne.getCreatedBy())).thenReturn(Optional.of(admin));
		when(profileRepository.findById(previousTwo.getCreatedBy())).thenReturn(Optional.of(admin));

		assertThatThrownBy(() -> useCase.execute(ideaId, userId))
				.isInstanceOf(VoteIdeaUseCase.OwnDepartmentVoteLimitExceededException.class)
				.hasMessageContaining("ADMIN");
		verify(voteRepository, never()).save(any());
	}

	@Test
	void extracts_department_prefix_before_hyphen() {
		assertThat(VoteIdeaUseCase.departmentCode("BD/SWD-ARC2")).isEqualTo("BD/SWD");
		assertThat(VoteIdeaUseCase.departmentCode("BD/RMO")).isEqualTo("BD/RMO");
		assertThat(VoteIdeaUseCase.normalizeIdentity("Mr. 朱一/ZHU Yi")).isEqualTo("yizhu");
	}
}
