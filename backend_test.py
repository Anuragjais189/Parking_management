import requests
import sys
import json
from datetime import datetime

class ParkingAPITester:
    def __init__(self, base_url="https://carspace-crud.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_spots = []  # Track created spots for cleanup

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    # Track created spots for cleanup
                    if method == 'POST' and 'api/spots' in endpoint and 'checkin' not in endpoint and 'checkout' not in endpoint and 'id' in response_data:
                        self.created_spots.append(response_data['id'])
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "api/dashboard/stats",
            200
        )
        if success:
            required_fields = ['total_spots', 'available_spots', 'occupied_spots', 'reserved_spots', 'maintenance_spots', 'total_revenue']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field in stats: {field}")
                    return False
            print(f"   Stats: {response}")
        return success

    def test_get_all_spots(self):
        """Test getting all parking spots"""
        success, response = self.run_test(
            "Get All Spots",
            "GET",
            "api/spots",
            200
        )
        if success:
            print(f"   Found {len(response)} spots")
        return success

    def test_create_spot(self, spot_number, spot_type, hourly_rate=5.0):
        """Test creating a parking spot"""
        data = {
            "spot_number": spot_number,
            "spot_type": spot_type,
            "hourly_rate": hourly_rate,
            "status": "available"
        }
        success, response = self.run_test(
            f"Create Spot {spot_number}",
            "POST",
            "api/spots",
            200,  # Backend returns 200 instead of 201
            data=data
        )
        if success:
            print(f"   Created spot with ID: {response.get('id')}")
            return response.get('id')
        return None

    def test_get_spot(self, spot_id):
        """Test getting a specific spot"""
        success, response = self.run_test(
            "Get Specific Spot",
            "GET",
            f"api/spots/{spot_id}",
            200
        )
        return success

    def test_update_spot(self, spot_id, update_data):
        """Test updating a parking spot"""
        success, response = self.run_test(
            "Update Spot",
            "PUT",
            f"api/spots/{spot_id}",
            200,
            data=update_data
        )
        return success

    def test_checkin_vehicle(self, spot_id, license_plate, driver_name=None, driver_phone=None):
        """Test checking in a vehicle"""
        data = {
            "vehicle_license": license_plate,
            "driver_name": driver_name,
            "driver_phone": driver_phone
        }
        success, response = self.run_test(
            f"Check-in Vehicle {license_plate}",
            "POST",
            f"api/spots/{spot_id}/checkin",
            200,
            data=data
        )
        if success:
            print(f"   Vehicle checked in: {response.get('vehicle_license')}")
        return success

    def test_checkout_vehicle(self, spot_id):
        """Test checking out a vehicle"""
        success, response = self.run_test(
            "Check-out Vehicle",
            "POST",
            f"api/spots/{spot_id}/checkout",
            200
        )
        if success:
            print(f"   Vehicle checked out from spot")
        return success

    def test_delete_spot(self, spot_id):
        """Test deleting a parking spot"""
        success, response = self.run_test(
            "Delete Spot",
            "DELETE",
            f"api/spots/{spot_id}",
            200
        )
        return success

    def test_search_functionality(self):
        """Test search functionality"""
        # Test search by spot number
        success1, _ = self.run_test(
            "Search by Spot Number",
            "GET",
            "api/spots",
            200,
            params={"search": "A1"}
        )
        
        # Test search by license plate
        success2, _ = self.run_test(
            "Search by License Plate",
            "GET",
            "api/spots",
            200,
            params={"search": "ABC123"}
        )
        
        return success1 and success2

    def test_filter_functionality(self):
        """Test filter functionality"""
        # Test filter by status
        success1, _ = self.run_test(
            "Filter by Status",
            "GET",
            "api/spots",
            200,
            params={"status": "available"}
        )
        
        # Test filter by spot type
        success2, _ = self.run_test(
            "Filter by Spot Type",
            "GET",
            "api/spots",
            200,
            params={"spot_type": "regular"}
        )
        
        return success1 and success2

    def cleanup_created_spots(self):
        """Clean up spots created during testing"""
        print(f"\n🧹 Cleaning up {len(self.created_spots)} created spots...")
        for spot_id in self.created_spots:
            try:
                requests.delete(f"{self.base_url}/api/spots/{spot_id}")
                print(f"   Deleted spot: {spot_id}")
            except:
                print(f"   Failed to delete spot: {spot_id}")

def main():
    print("🚗 Starting Parking Management API Tests")
    print("=" * 50)
    
    tester = ParkingAPITester()
    
    try:
        # Test 1: Dashboard stats (should work even with no spots)
        tester.test_dashboard_stats()
        
        # Test 2: Get all spots (initially empty)
        tester.test_get_all_spots()
        
        # Test 3: Create different types of parking spots with unique numbers
        timestamp = datetime.now().strftime("%H%M%S")
        spot_a1 = tester.test_create_spot(f"A1-{timestamp}", "regular", 5.0)
        spot_a2 = tester.test_create_spot(f"A2-{timestamp}", "handicap", 3.0)
        spot_b1 = tester.test_create_spot(f"B1-{timestamp}", "vip", 10.0)
        spot_c1 = tester.test_create_spot(f"C1-{timestamp}", "electric", 7.0)
        
        if not all([spot_a1, spot_a2, spot_b1, spot_c1]):
            print("❌ Failed to create all test spots")
            return 1
        
        # Test 4: Get specific spot
        tester.test_get_spot(spot_a1)
        
        # Test 5: Update spot
        tester.test_update_spot(spot_a1, {"hourly_rate": 6.0})
        
        # Test 6: Check-in vehicle
        tester.test_checkin_vehicle(spot_a1, "ABC123", "John Doe", "555-0123")
        
        # Test 7: Try to check-in to occupied spot (should fail)
        success, _ = tester.run_test(
            "Check-in to Occupied Spot (Should Fail)",
            "POST",
            f"api/spots/{spot_a1}/checkin",
            400,
            data={"vehicle_license": "XYZ789"}
        )
        
        # Test 8: Check-out vehicle
        tester.test_checkout_vehicle(spot_a1)
        
        # Test 9: Try to check-out from available spot (should fail)
        success, _ = tester.run_test(
            "Check-out from Available Spot (Should Fail)",
            "POST",
            f"api/spots/{spot_a1}/checkout",
            400
        )
        
        # Test 10: Search functionality
        tester.test_search_functionality()
        
        # Test 11: Filter functionality
        tester.test_filter_functionality()
        
        # Test 12: Dashboard stats after operations
        tester.test_dashboard_stats()
        
        # Test 13: Delete spot
        tester.test_delete_spot(spot_c1)
        
        # Test 14: Try to get deleted spot (should fail)
        success, _ = tester.run_test(
            "Get Deleted Spot (Should Fail)",
            "GET",
            f"api/spots/{spot_c1}",
            404
        )
        
    finally:
        # Cleanup remaining spots
        tester.cleanup_created_spots()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"❌ {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())