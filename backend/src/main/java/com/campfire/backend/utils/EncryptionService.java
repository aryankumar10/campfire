package com.campfire.backend.utils;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class EncryptionService {

    private final String keyHex;
    private static final String ALGORITHM = "AES/CBC/PKCS5Padding";
    private static final int IV_LENGTH = 16;

    public EncryptionService(@Value("${encryption.key}") String keyHex) {
        if (keyHex == null || keyHex.length() != 64) {
            throw new IllegalArgumentException("FATAL: ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
        }
        this.keyHex = keyHex;
    }

    private byte[] hexStringToByteArray(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
                                 + Character.digit(s.charAt(i+1), 16));
        }
        return data;
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    public String encryptMessage(String text) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);
            IvParameterSpec ivSpec = new IvParameterSpec(iv);

            byte[] keyBytes = hexStringToByteArray(this.keyHex);
            SecretKeySpec skeySpec = new SecretKeySpec(keyBytes, "AES");

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, skeySpec, ivSpec);

            byte[] encrypted = cipher.doFinal(text.getBytes("UTF-8"));

            return bytesToHex(iv) + ":" + bytesToHex(encrypted);
        } catch (Exception e) {
            throw new RuntimeException("Error while encrypting message", e);
        }
    }

    public String decryptMessage(String text) {
        try {
            String[] parts = text.split(":");
            if (parts.length < 2) return text; // Probably unencrypted message from before

            byte[] iv = hexStringToByteArray(parts[0]);
            byte[] encryptedText = hexStringToByteArray(parts[1]);

            IvParameterSpec ivSpec = new IvParameterSpec(iv);
            byte[] keyBytes = hexStringToByteArray(this.keyHex);
            SecretKeySpec skeySpec = new SecretKeySpec(keyBytes, "AES");

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, skeySpec, ivSpec);

            byte[] original = cipher.doFinal(encryptedText);

            return new String(original, "UTF-8");
        } catch (Exception e) {
            throw new RuntimeException("Error while decrypting message", e);
        }
    }
}
