package com.company.core.application;

import com.company.core.domain.entities.Agent;
import com.company.core.domain.repositories.AgentRepository;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class ChatService {

    private final AgentRepository agentRepository;

    public ChatService(AgentRepository agentRepository) {
        this.agentRepository = agentRepository;
    }

    public String getSystemInstructions(UUID agentId) {
        if (agentId == null) {
            return getDefaultInstructions();
        }
        return agentRepository.findById(agentId)
                .map(Agent::getSystemInstructions)
                .filter(instr -> instr != null && !instr.trim().isEmpty())
                .orElseGet(this::getDefaultInstructions);
    }

    private String getDefaultInstructions() {
        return "Você é um assistente virtual especialista no contexto de negócios e transportes verticais da Alfabra.";
    }
}
