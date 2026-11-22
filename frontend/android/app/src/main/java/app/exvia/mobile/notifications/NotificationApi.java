package app.exvia.mobile.notifications;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** The two requests the checker makes: renew the tokens, and list the notifications newer than one id. */
final class NotificationApi {
    /** The server no longer accepts the refresh token: the user has to sign in again in the app. */
    static final class SessionExpiredException extends Exception {
        SessionExpiredException() {
            super("The server rejected the refresh token");
        }
    }

    private static final String REFRESH_PATH = "/api/auth/token/refresh/";
    private static final String LIST_PATH = "/api/notifications/?after=";
    private static final int TIMEOUT_MS = 10_000;
    private static final int HTTP_OK = 200;
    private static final int HTTP_UNAUTHORIZED = 401;
    private static final int HTTP_ERROR_FROM = 400;
    private static final int READ_BUFFER_BYTES = 4096;

    private static final class HttpResponse {
        final int status;
        final String body;

        HttpResponse(int status, String body) {
            this.status = status;
            this.body = body;
        }
    }

    private final SessionStore store;

    NotificationApi(SessionStore store) {
        this.store = store;
    }

    /** The notifications created after `afterId`, oldest first. */
    List<JSONObject> fetchNotificationsAfter(long afterId)
            throws IOException, JSONException, SessionExpiredException {
        if (store.getAccessToken() == null) {
            refreshTokens();
        }
        HttpResponse response = requestList(afterId);
        if (response.status == HTTP_UNAUTHORIZED) {
            refreshTokens();
            response = requestList(afterId);
        }
        if (response.status != HTTP_OK) {
            throw new IOException("Listing notifications failed with status " + response.status);
        }
        return parseOldestFirst(response.body);
    }

    private HttpResponse requestList(long afterId) throws IOException {
        return send("GET", LIST_PATH + afterId, store.getAccessToken(), null);
    }

    private void refreshTokens() throws IOException, JSONException, SessionExpiredException {
        String body = new JSONObject().put("refresh", store.getRefreshToken()).toString();
        HttpResponse response = send("POST", REFRESH_PATH, null, body);
        if (response.status == HTTP_UNAUTHORIZED) {
            throw new SessionExpiredException();
        }
        if (response.status != HTTP_OK) {
            throw new IOException("Renewing the tokens failed with status " + response.status);
        }
        JSONObject tokens = new JSONObject(response.body);
        store.saveTokens(tokens.getString("access"), tokens.getString("refresh"));
    }

    private HttpResponse send(String method, String path, String accessToken, String jsonBody) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(store.getApiBaseUrl() + path).openConnection();
        try {
            connection.setRequestMethod(method);
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setRequestProperty("Accept", "application/json");
            if (accessToken != null) {
                connection.setRequestProperty("Authorization", "Bearer " + accessToken);
            }
            if (jsonBody != null) {
                writeJson(connection, jsonBody);
            }
            int status = connection.getResponseCode();
            return new HttpResponse(status, readBody(connection, status));
        } finally {
            connection.disconnect();
        }
    }

    private void writeJson(HttpURLConnection connection, String jsonBody) throws IOException {
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");
        try (OutputStream output = connection.getOutputStream()) {
            output.write(jsonBody.getBytes(StandardCharsets.UTF_8));
        }
    }

    private String readBody(HttpURLConnection connection, int status) throws IOException {
        InputStream stream = status >= HTTP_ERROR_FROM ? connection.getErrorStream() : connection.getInputStream();
        if (stream == null) {
            return "";
        }
        try (InputStream input = stream; ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
            byte[] chunk = new byte[READ_BUFFER_BYTES];
            int length;
            while ((length = input.read(chunk)) != -1) {
                buffer.write(chunk, 0, length);
            }
            return buffer.toString(StandardCharsets.UTF_8.name());
        }
    }

    private List<JSONObject> parseOldestFirst(String body) throws JSONException {
        JSONArray array = new JSONArray(body);
        List<JSONObject> notifications = new ArrayList<>();
        for (int index = 0; index < array.length(); index++) {
            notifications.add(array.getJSONObject(index));
        }
        Collections.reverse(notifications);
        return notifications;
    }
}
