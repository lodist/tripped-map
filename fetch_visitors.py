import requests
import json
from datetime import datetime, timedelta, timezone

# Replace with your actual API Token and Zone ID
API_TOKEN = "Aktmlr0CpEEteZFQ4GWKnUuIbbKWZXVYR3GrF2zt"
ZONE_ID = "f64847c236c3ab2b1073839372fe5de5"
GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql/"

# Get the start date (30 days ago) and end date (yesterday)
start_date = datetime.now(timezone.utc).replace(day=1).strftime("%Y-%m-%d")
end_date = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

graphql_query = {
    "query": f"""
    query {{
      viewer {{
        zones(filter: {{ zoneTag: "{ZONE_ID}" }}) {{
          httpRequests1dGroups(limit: 30, filter: {{ date_geq: "{start_date}", date_leq: "{end_date}" }}) {{
            uniq {{
              uniques
            }}
          }}
        }}
      }}
    }}"""
}

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

response = requests.post(GRAPHQL_URL, json=graphql_query, headers=headers)

# Extract unique visitors safely
data = response.json()
if "data" in data and data["data"]["viewer"]["zones"]:
    daily_uniques = data["data"]["viewer"]["zones"][0]["httpRequests1dGroups"]
    total_unique_visitors = sum(day["uniq"]["uniques"] for day in daily_uniques)

    print(f"Unique visitors in the past 30 days: {total_unique_visitors}")

    # Update visitors.json with new count
    VISITOR_FILE = "visitors.json"
    try:
        with open(VISITOR_FILE, "r") as f:
            current_data = json.load(f)
        current_data["count"] = total_unique_visitors
    except FileNotFoundError:
        current_data = {"count": total_unique_visitors}

    with open(VISITOR_FILE, "w") as f:
        json.dump(current_data, f, indent=2)
else:
    print("No data found or failed API request")
