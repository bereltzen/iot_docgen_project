# ENV-SENSOR-8832 API Documentation

**Firmware Version:** v2.1.4-beta | **Status:** active | **Protocols:** MQTT, HTTP

## 1. Overview

The ENV-SENSOR-8832 is an active environmental sensor hub designed to monitor temperature, humidity, and CO2 levels. It broadcasts telemetry data at a 5000ms interval and supports both MQTT and HTTP protocols. The HTTP API allows for retrieving current sensor readings and executing administrative hardware commands.

The base URL for all HTTP endpoints is: `http://<device_ip>:8080`

## 2. Authentication

Standard data retrieval endpoints do not require authentication. However, administrative endpoints require identity verification using a custom API key header.

* **Header Key:** `X-API-Key`
* **Format:** `X-API-Key: <your_admin_key>`
* **Scope:** Administrative endpoints (e.g., system reboot).

## 3. Endpoints

### `GET` `/api/v1/sensors/current`

* **Description:** Retrieves the latest readings from all active environmental sensors attached to the hub (temperature, humidity, and CO2).
* **Rate Limits / Constraints:** Strictly limited to a maximum of **10 requests per minute**. Exceeding this rate limit may cause hardware lockup.
* **Request Structure:**
* **Headers:** None required
* **Parameters:** None required


* **Response Structure:**
```json
{
  "temp": 22.5,
  "hum": 45,
  "co2": 420
}

```



### `POST` `/api/v1/system/reboot`

* **Description:** Triggers a hardware reboot of the sensor hub.
* **Rate Limits / Constraints:** Not explicitly defined. Note that the device takes approximately 45 seconds to come back online after this command is successfully issued.
* **Request Structure:**
| Header | Type | Required | Description |
| --- | --- | --- | --- |
| `X-API-Key` | String | Yes | Admin API key to verify authorization. |


* **Response Structure:**

```json
  {
    "status": "rebooting"
  }

```

## 4. Error Codes & Edge Cases

| Issue / Error Code | Component / Endpoint | Description & Handling |
| --- | --- | --- |
| **`401 Unauthorized`** | `/api/v1/system/reboot` | Returned when the `X-API-Key` header is missing, invalid, or lacks admin privileges. Response payload: `{"error": "unauthorized"}`. |
| **`-1` Sensor Value** | `co2_ppm` Sensor | If the CO2 reading returns `-1`, the sensor is currently undergoing calibration. Clients should ignore this value and retry in subsequent polling cycles. |
| **Hardware Lockup** | `/api/v1/sensors/current` | Triggered by exceeding the 10 requests/minute rate limit. Clients must implement strict rate-limiting or backoff strategies to prevent device failure. |
| **Reboot Latency** | `/api/v1/system/reboot` | Following a successful 200 OK response with `{"status": "rebooting"}`, clients must expect a ~45-second downtime window where the device will not respond to HTTP or MQTT requests. |

```

```
