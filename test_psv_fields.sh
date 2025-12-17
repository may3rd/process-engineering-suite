#!/bin/bash
# Comprehensive PSV Field Update Test

PSV_ID="16ceb8da-6d68-4635-b83b-10beda4f7f66"
API_URL="http://localhost:8000"

echo "🧪 Testing PSV Field Updates"
echo "=============================="
sleep 5

# Test all fields
echo "1️⃣  name..."
curl -s -X PUT "${API_URL}/psv/${PSV_ID}" -H "Content-Type: application/json" -d '{"name": "Test Name Updated"}' | jq -r '.name'

echo "2️⃣  tag..."
curl -s -X PUT "${API_URL}/psv/${PSV_ID}" -H "Content-Type: application/json" -d '{"tag": "PSV-999"}' | jq -r '.tag'

echo "3️⃣  type..."
curl -s -X PUT "${API_URL}/psv/${PSV_ID}" -H "Content-Type: application/json" -d '{"type": "rupture_disc"}' | jq -r '.type'
curl -s -X PUT "${API_URL}/psv/${PSV_ID}" -H "Content-Type: application/json" -d '{"type": "psv"}' > /dev/null

echo "4️⃣  designCode..."
curl -s -X PUT "${API_URL}/psv/${PSV_ID}" -H "Content-Type: application/json" -d '{"designCode": "API-521"}' | jq -r '.designCode'

echo "5️⃣  serviceFluid..."
curl -s -X PUT "${API_URL}/psv/${PSV_ID}" -H "Content-Type: application/json" -d '{"serviceFluid": "Propane"}' | jq -r '.serviceFluid'

echo "6️⃣  fluidPhase..."
curl -s -X PUT "${API_URL}/psv/${PSV_ID}" -H "Content-Type: application/json" -d '{"fluidPhase": "liquid"}' | jq -r '.fluidPhase'

echo "7️⃣  setPressure..."
curl -s -X PUT "${API_URL}/psv/${PSV_ID}" -H "Content-Type: application/json" -d '{"setPressure": 5.5}' | jq -r '.setPressure'

echo "8️⃣  mawp..."
curl -s -X PUT "${API_URL}/psv/${PSV_ID}" -H "Content-Type: application/json" -d '{"mawp": 6.5}' | jq -r '.mawp'

echo "9️⃣  status..."
curl -s -X PUT "${API_URL}/psv/${PSV_ID}" -H "Content-Type: application/json" -d '{"status": "approved"}' | jq -r '.status'

echo "🔟 valveType..."
curl -s -X PUT "${API_URL}/psv/${PSV_ID}" -H "Content-Type: application/json" -d '{"valveType": "pilot_operated"}' | jq -r '.valveType'

echo "✅ All fields tested!"
