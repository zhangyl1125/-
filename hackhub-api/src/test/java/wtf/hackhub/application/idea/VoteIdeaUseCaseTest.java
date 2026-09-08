package wtf.hackhub.application.idea;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import wtf.hackhub.domain.*;
import wtf.hackhub.infrastructure.persistence.IdeaMutationLock;
import wtf.hackhub.infrastructure.persistence.auth.ProfileRepository;
import wtf.hackhub.infrastructure.persistence.idea.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class VoteIdeaUseCaseTest {
	IdeaRepository ideas = mock(IdeaRepository.class);
	IdeaVoteRepository votes = mock(IdeaVoteRepository.class);
	ProfileRepository profiles = mock(ProfileRepository.class);
	VotingParticipantRepository roster = mock(VotingParticipantRepository.class);
	IdeaMutationLock lock = mock(IdeaMutationLock.class);
	VoteIdeaUseCase useCase = new VoteIdeaUseCase(ideas, votes, profiles, new NomineeDirectory(profiles, roster), lock);
	UUID voter, award = UUID.randomUUID();
	Map<UUID, Idea> nominations = new HashMap<>();
	Map<UUID, Profile> people = new HashMap<>();
	Map<String, VotingParticipant> participants = new HashMap<>();
	Map<UUID, IdeaVote> ballot = new HashMap<>();

	UUID person(String name, String org) {
		UUID id = UUID.randomUUID();
		people.put(id, new Profile(name + "@bosch.com", name, "hash"));
		if (org != null)
			participants.put(VoteIdeaUseCase.normalizeIdentity(name),
					new VotingParticipant(id.toString(), org, name, VoteIdeaUseCase.normalizeIdentity(name)));
		return id;
	}
	UUID nomination(String org, String track) {
		UUID owner = person("person" + nominations.size(), org);
		Idea idea = new Idea("Contribution", "Evidence", award, null, owner, track);
		UUID id = UUID.randomUUID();
		ReflectionTestUtils.setField(idea, "id", id);
		nominations.put(id, idea);
		return id;
	}
	@BeforeEach
	void setup() {
		voter = person("alice.wang", "BD/DPA-SRE3");
		when(ideas.findById(any())).thenAnswer(c -> Optional.ofNullable(nominations.get(c.getArgument(0))));
		when(profiles.findByIdForUpdate(any())).thenAnswer(c -> Optional.ofNullable(people.get(c.getArgument(0))));
		when(profiles.findById(any())).thenAnswer(c -> Optional.ofNullable(people.get(c.getArgument(0))));
		when(roster.findAllByNormalizedName(anyString())).thenAnswer(c -> {
			var p = participants.get(c.getArgument(0));
			return p == null ? List.of() : List.of(p);
		});
		when(votes.findByIdeaIdAndUserId(any(), any()))
				.thenAnswer(c -> Optional.ofNullable(ballot.get(c.getArgument(0))));
		when(votes.findAllByUserIdAndHackathonId(any(), any())).thenAnswer(c -> ballot.values().stream()
				.filter(v -> nominations.get(v.getIdeaId()).getHackathonId().equals(c.getArgument(1))).toList());
		when(votes.save(any())).thenAnswer(c -> {
			IdeaVote v = c.getArgument(0);
			ballot.put(v.getIdeaId(), v);
			return v;
		});
		doAnswer(c -> {
			ballot.remove(((IdeaVote) c.getArgument(0)).getIdeaId());
			return null;
		}).when(votes).delete(any());
		when(votes.countByIdeaId(any())).thenAnswer(c -> ballot.containsKey(c.getArgument(0)) ? 1L : 0L);
	}
	@Test
	void clear_all_reads_only_own_ballot_under_voter_lock() {
		UUID own = nomination("BD/DPA-SRE3", "Customer Values");
		UUID outside = nomination("BD/BA-AP", "Innovation Breakthrough");
		var selected = List.of(new IdeaVote(own, voter), new IdeaVote(outside, voter));
		when(votes.findAllByUserId(voter)).thenReturn(selected);
		useCase.clearAll(voter);
		var ordered = inOrder(profiles, votes);
		ordered.verify(profiles).findByIdForUpdate(voter);
		ordered.verify(votes).findAllByUserId(voter);
		ordered.verify(votes).deleteAll(selected);
		verifyNoInteractions(lock);
	}

	@Test
	void clear_all_rejects_unknown_user_without_deleting() {
		assertThatThrownBy(() -> useCase.clearAll(UUID.randomUUID()))
				.isInstanceOf(VoteIdeaUseCase.ParticipantNotEligibleException.class);
		verify(votes, never()).deleteAll(anyIterable());
	}

	@Test
	void requires_outside_vote_before_first_own_vote() {
		UUID own = nomination("BD/DPA-XYZ", "Customer Values");
		assertThatThrownBy(() -> useCase.execute(own, voter)).isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("50%");
		assertThat(ballot).isEmpty();
	}
	@Test
	void accepts_two_outside_two_own_and_rejects_fifth() {
		assertThat(useCase.execute(nomination("BD/BA-AP", "Customer Values"), voter).voteCount()).isEqualTo(1);
		useCase.execute(nomination("BD/DPA-XYZ", "Customer Values"), voter);
		useCase.execute(nomination("BD/BA-OTHER", "Customer Values"), voter);
		useCase.execute(nomination("BD/DPA-ABC", "Customer Values"), voter);
		assertThatThrownBy(() -> useCase.execute(nomination("BD/BA-AP", "Customer Values"), voter))
				.isInstanceOf(VoteIdeaUseCase.VoteLimitExceededException.class);
		assertThat(ballot).hasSize(4);
	}
	@Test
	void rejects_own_vote_at_one_outside_one_own() {
		useCase.execute(nomination("BD/BA-AP", "Customer Values"), voter);
		useCase.execute(nomination("BD/DPA-XYZ", "Customer Values"), voter);
		assertThatThrownBy(() -> useCase.execute(nomination("BD/DPA-SRE2", "Customer Values"), voter))
				.isInstanceOf(IllegalArgumentException.class);
		assertThat(ballot).hasSize(2);
	}
	@Test
	void cannot_remove_outside_vote_if_it_breaks_ratio() {
		UUID outside = nomination("BD/BA-AP", "Customer Values"), own = nomination("BD/DPA-XYZ", "Customer Values");
		useCase.execute(outside, voter);
		useCase.execute(own, voter);
		assertThatThrownBy(() -> useCase.execute(outside, voter))
				.hasMessageContaining("Remove a same-department vote first");
		assertThat(ballot).hasSize(2);
		assertThat(useCase.execute(own, voter).voted()).isFalse();
		assertThat(useCase.execute(outside, voter).voteCount()).isZero();
		assertThat(ballot).isEmpty();
	}
	@Test
	void allows_four_outside_votes_and_independent_track_quotas() {
		for (int i = 0; i < 4; i++)
			useCase.execute(nomination("BD/BA-AP", "Customer Values"), voter);
		useCase.execute(nomination("BD/BA-AP", "Collaboration"), voter);
		assertThat(ballot).hasSize(5);
	}
	@Test
	void tracks_compare_case_insensitively() {
		for (int i = 0; i < 4; i++)
			useCase.execute(nomination("BD/BA-AP", "Customer Values"), voter);
		assertThatThrownBy(() -> useCase.execute(nomination("BD/BA-AP", "customer values"), voter))
				.isInstanceOf(VoteIdeaUseCase.VoteLimitExceededException.class);
	}
	@Test
	void rejects_non_roster_admin_without_inventing_department() {
		UUID outsider = person("unmapped", null);
		people.get(outsider).changeRole(Profile.Role.ADMIN);
		assertThatThrownBy(() -> useCase.execute(nomination("BD/BA-AP", "Customer Values"), outsider))
				.isInstanceOf(VoteIdeaUseCase.ParticipantNotEligibleException.class);
	}
	@Test
	void rejects_unknown_nominee_department() {
		assertThatThrownBy(() -> useCase.execute(nomination(null, "Customer Values"), voter))
				.isInstanceOf(VoteIdeaUseCase.ProjectDepartmentUnknownException.class);
	}
	@Test
	void uses_nominee_instead_of_nominator_or_supplied_department() {
		UUID target = nomination("BD/DPA-SRE3", "Customer Values"), nominee = person("bob.chen", "BD/BA-AP");
		nominations.get(target).update("Contribution", "Evidence", "Customer Values", List.of(), Idea.Status.SUBMITTED,
				null, null,
				"[{\"type\":\"nomination\",\"nomineeUserId\":\"" + nominee + "\",\"nomineeOrgCode\":\"BD/DPA\"}]");
		assertThat(useCase.execute(target, voter).voted()).isTrue();
	}
	@Test
	void serializes_mutations_before_reading_ballot() {
		UUID target = nomination("BD/BA-AP", "Customer Values");
		useCase.execute(target, voter);
		var ordered = inOrder(lock, profiles, votes);
		ordered.verify(lock).acquire(target);
		ordered.verify(profiles).findByIdForUpdate(voter);
		ordered.verify(votes).findByIdeaIdAndUserId(target, voter);
	}
	@Test
	void extracts_prefix_and_normalizes_names() {
		assertThat(VoteIdeaUseCase.departmentCode(" BD/DPA-SRE3 ")).isEqualTo("BD/DPA");
		assertThat(VoteIdeaUseCase.departmentCode("BD/BA-AP")).isEqualTo("BD/BA");
		assertThat(VoteIdeaUseCase.departmentCode("BD/RMO")).isEqualTo("BD/RMO");
		assertThat(VoteIdeaUseCase.normalizeIdentity("Mr. 朱一/ZHU Yi")).isEqualTo("yizhu");
	}
	@Test
	void repeated_vote_toggles_without_duplicate_and_can_be_added_again() {
		UUID target = nomination("BD/BA-AP", "Customer Values");
		assertThat(useCase.execute(target, voter).voted()).isTrue();
		assertThat(useCase.execute(target, voter).voted()).isFalse();
		assertThat(ballot).isEmpty();
		assertThat(useCase.execute(target, voter).voteCount()).isEqualTo(1);
		assertThat(ballot).hasSize(1);
	}

	@Test
	void independent_awards_do_not_share_quota() {
		for (int i = 0; i < 4; i++)
			useCase.execute(nomination("BD/BA-AP", "Customer Values"), voter);
		award = UUID.randomUUID();
		assertThat(useCase.execute(nomination("BD/BA-AP", "Customer Values"), voter).voted()).isTrue();
		assertThat(ballot).hasSize(5);
	}

	@Test
	void removing_from_two_outside_two_own_requires_removing_own_first() {
		UUID outside = nomination("BD/BA-AP", "Customer Values");
		useCase.execute(outside, voter);
		useCase.execute(nomination("BD/BA-OTHER", "Customer Values"), voter);
		UUID own = nomination("BD/DPA-SRE2", "Customer Values");
		useCase.execute(own, voter);
		useCase.execute(nomination("BD/DPA-SRE3", "Customer Values"), voter);
		assertThatThrownBy(() -> useCase.execute(outside, voter)).hasMessageContaining("50%");
		useCase.execute(own, voter);
		assertThat(useCase.execute(outside, voter).voted()).isFalse();
		assertThat(ballot).hasSize(2);
	}

	@Test
	void clear_track_only_removes_votes_in_selected_category() {
		UUID value = nomination("BD/BA-AP", "Customer Values");
		UUID collaboration = nomination("BD/BA-AP", "Collaboration");
		useCase.execute(value, voter);
		useCase.execute(collaboration, voter);
		useCase.clearTrack(award, voter, "Customer Values");
		verify(votes).deleteAll(argThat(selected -> {
			var ids = new ArrayList<UUID>();
			selected.forEach(vote -> ids.add(vote.getIdeaId()));
			return ids.equals(List.of(value));
		}));
	}

	@Test
	void throws_for_unknown_idea() {
		assertThatThrownBy(() -> useCase.execute(UUID.randomUUID(), voter))
				.isInstanceOf(VoteIdeaUseCase.IdeaNotFoundException.class);
	}
}
