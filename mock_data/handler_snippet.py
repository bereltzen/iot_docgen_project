# quick n dirty router for the sensor hub
@app.route('/api/v1/sensors/current', methods=['GET'])
def get_current_readings():
    # Returns all active sensors.
    # Output format: {"temp": 22.5, "hum": 45, "co2": 420}
    return fetch_hardware_registers()

@app.route('/api/v1/system/reboot', methods=['POST'])
def trigger_reboot():
    # warning: takes about 45 seconds to come back online
    if not verify_admin(request):
        return {"error": "unauthorized"}, 401
    hardware.reboot()
    return {"status": "rebooting"}