#!/usr/bin/env bash
# ==============================================================================
# APIWatch Production Smoke Test Script (Bash / cURL)
# ==============================================================================
# Usage:
#   ./scripts/smoke-test.sh https://apiwatch.example.com
# ==============================================================================

set -euo pipefail

TARGET_URL="${1:-${APP_URL:-http://localhost:3000}}"

echo "================================================================================"
echo "🚀 APIWatch Production Smoke Test: ${TARGET_URL}"
echo "================================================================================"

PASSED=0
FAILED=0

test_endpoint() {
    local NAME="$1"
    local PATH="$2"
    local EXPECTED_CODE="$3"

    local FULL_URL="${TARGET_URL}${PATH}"
    local HTTP_CODE
    HTTP_CODE=$(curl -k -s -o /dev/null -w "%{http_code}" -m 10 "${FULL_URL}" || echo "000")

    if [[ "$HTTP_CODE" =~ ^($EXPECTED_CODE)$ ]]; then
        printf "✅ [PASS] %-36s HTTP %s\n" "${NAME}" "${HTTP_CODE}"
        PASSED=$((PASSED + 1))
    else
        printf "❌ [FAIL] %-36s HTTP %s (Expected: %s)\n" "${NAME}" "${HTTP_CODE}" "${EXPECTED_CODE}"
        FAILED=$((FAILED + 1))
    fi
}

test_endpoint "Liveness Health Probe" "/api/health?probe=live" "200"
test_endpoint "Readiness Health Probe" "/api/health?probe=ready" "200|503"
test_endpoint "Prometheus Telemetry" "/api/metrics" "200"
test_endpoint "Public Landing Page" "/" "200"
test_endpoint "SaaS Pricing Page" "/pricing" "200"
test_endpoint "Public Status Board" "/status" "200"
test_endpoint "User Login Page" "/login" "200"
test_endpoint "User Registration Page" "/register" "200"
test_endpoint "Robots.txt Directive" "/robots.txt" "200"
test_endpoint "XML Sitemap" "/sitemap.xml" "200"
test_endpoint "Open Graph Image" "/opengraph-image" "200"

echo "================================================================================"
echo "Smoke Test Summary: ${PASSED} Passed, ${FAILED} Failed"
echo "================================================================================"

if [ "$FAILED" -gt 0 ]; then
    echo "❌ Smoke test failed!"
    exit 1
else
    echo "🎉 All smoke tests completed successfully!"
    exit 0
fi
