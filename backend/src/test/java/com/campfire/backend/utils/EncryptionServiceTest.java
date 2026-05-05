package com.campfire.backend.utils;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class EncryptionServiceTest {

    @Test
    public void testEncryptionDecryption() {
        // 64-character hex string (32 bytes)
        String key = "e5163faaf7457b98bfb97ef560127e1f13fa2a3c74c935c1d683a45c71120eb0";
        EncryptionService encryptionService = new EncryptionService(key);

        String originalMessage = "Hello World! This is a secret test message.";
        String encrypted = encryptionService.encryptMessage(originalMessage);

        assertNotNull(encrypted);
        assertNotEquals(originalMessage, encrypted);
        assertTrue(encrypted.contains(":"));

        String decrypted = encryptionService.decryptMessage(encrypted);
        assertEquals(originalMessage, decrypted);
    }
}
