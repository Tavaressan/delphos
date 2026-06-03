package com.company.core.infrastructure.config;

import org.springframework.amqp.core.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.Map;

@Configuration
public class RabbitMQConfig {

    public static final String EXCHANGE_NAME = "agent.execution.exchange";
    public static final String DLX_NAME = "agent.execution.dlx";

    public static final String QUEUE_JOBS = "agent.execution.jobs";
    public static final String QUEUE_RETRY = "agent.execution.retry";
    public static final String QUEUE_DLQ = "agent.execution.dlq";
    public static final String QUEUE_EVENTS = "agent.execution.events";

    public static final String ROUTING_KEY_JOBS = "agent.execution.jobs";
    public static final String ROUTING_KEY_RETRY = "agent.execution.retry";
    public static final String ROUTING_KEY_DLQ = "agent.execution.dlq";
    public static final String ROUTING_KEY_EVENTS = "agent.execution.events";

    @Bean
    public DirectExchange agentExchange() {
        return new DirectExchange(EXCHANGE_NAME, true, false);
    }

    @Bean
    public DirectExchange agentDlx() {
        return new DirectExchange(DLX_NAME, true, false);
    }

    @Bean
    public Queue jobsQueue() {
        Map<String, Object> args = new HashMap<>();
        // Configure dead-letter exchange so rejected messages go to the retry queue
        args.put("x-dead-letter-exchange", DLX_NAME);
        args.put("x-dead-letter-routing-key", ROUTING_KEY_RETRY);
        return new Queue(QUEUE_JOBS, true, false, false, args);
    }

    @Bean
    public Binding bindingJobsQueue(Queue jobsQueue, DirectExchange agentExchange) {
        return BindingBuilder.bind(jobsQueue).to(agentExchange).with(ROUTING_KEY_JOBS);
    }

    @Bean
    public Queue retryQueue() {
        Map<String, Object> args = new HashMap<>();
        // After message TTL expires, send it back to the main exchange with jobs routing key
        args.put("x-dead-letter-exchange", EXCHANGE_NAME);
        args.put("x-dead-letter-routing-key", ROUTING_KEY_JOBS);
        args.put("x-message-ttl", 5000); // 5 seconds retry backoff delay
        return new Queue(QUEUE_RETRY, true, false, false, args);
    }

    @Bean
    public Binding bindingRetryQueue(Queue retryQueue, DirectExchange agentDlx) {
        return BindingBuilder.bind(retryQueue).to(agentDlx).with(ROUTING_KEY_RETRY);
    }

    @Bean
    public Queue dlqQueue() {
        return new Queue(QUEUE_DLQ, true, false, false);
    }

    @Bean
    public Binding bindingDlqQueue(Queue dlqQueue, DirectExchange agentDlx) {
        return BindingBuilder.bind(dlqQueue).to(agentDlx).with(ROUTING_KEY_DLQ);
    }

    @Bean
    public Queue eventsQueue() {
        return new Queue(QUEUE_EVENTS, true, false, false);
    }

    @Bean
    public Binding bindingEventsQueue(Queue eventsQueue, DirectExchange agentExchange) {
        return BindingBuilder.bind(eventsQueue).to(agentExchange).with(ROUTING_KEY_EVENTS);
    }
}
