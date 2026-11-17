package com.campfire.backend.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelRequest;
import software.amazon.awssdk.services.bedrockruntime.model.InvokeModelResponse;

import java.util.List;
import java.util.Map;

@Service
public class BedrockService {

    private final BedrockRuntimeClient bedrockClient;
    private final ObjectMapper objectMapper;

    @Value("${aws.bedrock.model-id:us.anthropic.claude-haiku-4-5-20251001-v1:0}")
    private String modelId;

    public BedrockService(BedrockRuntimeClient bedrockClient) {
        this.bedrockClient = bedrockClient;
        this.objectMapper = new ObjectMapper();
    }

    public String summarizeChat(List<Map<String, String>> messages, String roomName) {
        StringBuilder transcript = new StringBuilder();
        for (Map<String, String> msg : messages) {
            transcript.append(msg.getOrDefault("username", "Unknown"))
                      .append(": ")
                      .append(msg.getOrDefault("message", ""))
                      .append("\n");
        }

        String systemPrompt =
            "You are a helpful assistant for a team chat application called Campfire. " +
            "Your job is to read a chat room transcript and produce a concise, structured summary. " +
            "Format your response as:\n" +
            "**Key Decisions:**\n- (bullet list)\n\n" +
            "**Action Items:**\n- (bullet list with owner if mentioned)\n\n" +
            "**TL;DR:**\n(1-2 sentence overview)\n\n" +
            "Be concise and factual. Only include what was actually discussed.";

        String userMessage = String.format(
            "Please summarize the following chat transcript from room '%s':\n\n%s",
            roomName, transcript.toString()
        );

        return invokeModel(systemPrompt, userMessage);
    }

    public String answerQuestion(List<Map<String, String>> messages, String userQuestion,
                                  String roomName, String askedBy) {
        StringBuilder transcript = new StringBuilder();
        for (Map<String, String> msg : messages) {
            transcript.append(msg.getOrDefault("username", "Unknown"))
                      .append(": ")
                      .append(msg.getOrDefault("message", ""))
                      .append("\n");
        }

        String systemPrompt =
            "You are an assistant embedded in Campfire, a team collaboration app. " +
            "You have access to the message history of a chat room as your ONLY knowledge source. " +
            "Answer the user's question based ONLY on the information found in the chat transcript. " +
            "If the answer is not in the transcript, say: \"I couldn't find that in the chat history.\" " +
            "Do not make up information. Be concise and direct. " +
            "If quoting something specific, mention who said it.";

        String userMessage = String.format(
            "Chat room: '%s'\n\n--- CHAT TRANSCRIPT ---\n%s\n--- END TRANSCRIPT ---\n\n" +
            "%s is asking: %s",
            roomName, transcript.toString(), askedBy, userQuestion
        );

        return invokeModel(systemPrompt, userMessage);
    }

    private String invokeModel(String systemPrompt, String userMessage) {
        try {
            ObjectNode requestBody = objectMapper.createObjectNode();
            requestBody.put("anthropic_version", "bedrock-2023-05-31");
            requestBody.put("max_tokens", 1024);
            requestBody.put("system", systemPrompt);

            ArrayNode messagesArray = objectMapper.createArrayNode();
            ObjectNode userTurn = objectMapper.createObjectNode();
            userTurn.put("role", "user");

            ArrayNode contentArray = objectMapper.createArrayNode();
            ObjectNode textContent = objectMapper.createObjectNode();
            textContent.put("type", "text");
            textContent.put("text", userMessage);
            contentArray.add(textContent);

            userTurn.set("content", contentArray);
            messagesArray.add(userTurn);
            requestBody.set("messages", messagesArray);

            String requestBodyJson = objectMapper.writeValueAsString(requestBody);

            InvokeModelRequest request = InvokeModelRequest.builder()
                    .modelId(modelId)
                    .contentType("application/json")
                    .accept("application/json")
                    .body(SdkBytes.fromUtf8String(requestBodyJson))
                    .build();

            InvokeModelResponse response = bedrockClient.invokeModel(request);
            String responseBody = response.body().asUtf8String();

            JsonNode responseJson = objectMapper.readTree(responseBody);
            JsonNode contentNode = responseJson.path("content");
            if (contentNode.isArray() && contentNode.size() > 0) {
                return contentNode.get(0).path("text").asText("No response generated.");
            }

            return "No response generated.";
        } catch (Exception e) {
            throw new RuntimeException("Bedrock invocation failed: " + e.getMessage(), e);
        }
    }
}
