package com.company.core.domain.entities;

import com.company.core.domain.repositories.AgentExecutionRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.dao.OptimisticLockingFailureException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class AgentExecutionTest {

    @Test
    void agentExecution_hasVersionFieldWithInitialValue() {
        AgentExecution execution = new AgentExecution();
        assertThat(execution.getVersion()).isEqualTo(0L);

        execution.setVersion(1L);
        assertThat(execution.getVersion()).isEqualTo(1L);
    }

    @Test
    void repositorySave_staleVersion_throwsOptimisticLockingFailureException() {
        AgentExecutionRepository repository = Mockito.mock(AgentExecutionRepository.class);

        AgentExecution staleExecution = new AgentExecution();
        staleExecution.setId(UUID.randomUUID());
        staleExecution.setVersion(0L);

        when(repository.save(any(AgentExecution.class)))
                .thenThrow(new OptimisticLockingFailureException("Optimistic locking failure: stale entity version"));

        assertThatThrownBy(() -> repository.save(staleExecution))
                .isInstanceOf(OptimisticLockingFailureException.class)
                .hasMessageContaining("Optimistic locking failure");
    }
}
