from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Parking Management API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.parking_management
spots_collection = db.parking_spots

# Pydantic models
class ParkingSpot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    spot_number: str
    spot_type: str = Field(..., description="regular, handicap, vip, electric")
    is_occupied: bool = False
    vehicle_license: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    entry_time: Optional[datetime] = None
    exit_time: Optional[datetime] = None
    hourly_rate: float = 5.0
    reserved_by: Optional[str] = None
    status: str = "available"  # available, occupied, reserved, maintenance
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ParkingSpotCreate(BaseModel):
    spot_number: str
    spot_type: str
    hourly_rate: float = 5.0
    status: str = "available"

class ParkingSpotUpdate(BaseModel):
    spot_number: Optional[str] = None
    spot_type: Optional[str] = None
    hourly_rate: Optional[float] = None
    status: Optional[str] = None

class CheckInRequest(BaseModel):
    vehicle_license: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None

class DashboardStats(BaseModel):
    total_spots: int
    available_spots: int
    occupied_spots: int
    reserved_spots: int
    maintenance_spots: int
    total_revenue: float

@app.get("/")
async def root():
    return {"message": "Parking Management API"}

@app.get("/api/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    pipeline = [
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "revenue": {
                    "$sum": {
                        "$cond": [
                            {"$eq": ["$status", "occupied"]},
                            {"$multiply": ["$hourly_rate", 1]},  # Simplified revenue calculation
                            0
                        ]
                    }
                }
            }
        }
    ]
    
    result = await spots_collection.aggregate(pipeline).to_list(length=None)
    
    stats = {
        "total_spots": 0,
        "available_spots": 0,
        "occupied_spots": 0,
        "reserved_spots": 0,
        "maintenance_spots": 0,
        "total_revenue": 0.0
    }
    
    for item in result:
        status = item["_id"]
        count = item["count"]
        revenue = item.get("revenue", 0)
        
        stats["total_spots"] += count
        stats["total_revenue"] += revenue
        
        if status == "available":
            stats["available_spots"] = count
        elif status == "occupied":
            stats["occupied_spots"] = count
        elif status == "reserved":
            stats["reserved_spots"] = count
        elif status == "maintenance":
            stats["maintenance_spots"] = count
    
    return stats

@app.get("/api/spots", response_model=List[ParkingSpot])
async def get_all_spots(
    status: Optional[str] = Query(None, description="Filter by status"),
    spot_type: Optional[str] = Query(None, description="Filter by spot type"),
    search: Optional[str] = Query(None, description="Search by spot number or license plate")
):
    """Get all parking spots with optional filtering"""
    filter_query = {}
    
    if status:
        filter_query["status"] = status
    if spot_type:
        filter_query["spot_type"] = spot_type
    if search:
        filter_query["$or"] = [
            {"spot_number": {"$regex": search, "$options": "i"}},
            {"vehicle_license": {"$regex": search, "$options": "i"}}
        ]
    
    spots = await spots_collection.find(filter_query).sort("spot_number", 1).to_list(length=None)
    return [ParkingSpot(**spot) for spot in spots]

@app.get("/api/spots/{spot_id}", response_model=ParkingSpot)
async def get_spot(spot_id: str):
    """Get a specific parking spot"""
    spot = await spots_collection.find_one({"id": spot_id})
    if not spot:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    return ParkingSpot(**spot)

@app.post("/api/spots", response_model=ParkingSpot)
async def create_spot(spot_data: ParkingSpotCreate):
    """Create a new parking spot"""
    # Check if spot number already exists
    existing_spot = await spots_collection.find_one({"spot_number": spot_data.spot_number})
    if existing_spot:
        raise HTTPException(status_code=400, detail="Spot number already exists")
    
    new_spot = ParkingSpot(**spot_data.dict())
    await spots_collection.insert_one(new_spot.dict())
    return new_spot

@app.put("/api/spots/{spot_id}", response_model=ParkingSpot)
async def update_spot(spot_id: str, spot_update: ParkingSpotUpdate):
    """Update a parking spot"""
    spot = await spots_collection.find_one({"id": spot_id})
    if not spot:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    
    update_data = {k: v for k, v in spot_update.dict().items() if v is not None}
    if update_data:
        await spots_collection.update_one({"id": spot_id}, {"$set": update_data})
    
    updated_spot = await spots_collection.find_one({"id": spot_id})
    return ParkingSpot(**updated_spot)

@app.delete("/api/spots/{spot_id}")
async def delete_spot(spot_id: str):
    """Delete a parking spot"""
    result = await spots_collection.delete_one({"id": spot_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    return {"message": "Parking spot deleted successfully"}

@app.post("/api/spots/{spot_id}/checkin", response_model=ParkingSpot)
async def checkin_vehicle(spot_id: str, checkin_data: CheckInRequest):
    """Check in a vehicle to a parking spot"""
    spot = await spots_collection.find_one({"id": spot_id})
    if not spot:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    
    if spot["status"] != "available":
        raise HTTPException(status_code=400, detail="Parking spot is not available")
    
    update_data = {
        "is_occupied": True,
        "status": "occupied",
        "vehicle_license": checkin_data.vehicle_license,
        "driver_name": checkin_data.driver_name,
        "driver_phone": checkin_data.driver_phone,
        "entry_time": datetime.now(timezone.utc),
        "exit_time": None
    }
    
    await spots_collection.update_one({"id": spot_id}, {"$set": update_data})
    updated_spot = await spots_collection.find_one({"id": spot_id})
    return ParkingSpot(**updated_spot)

@app.post("/api/spots/{spot_id}/checkout", response_model=ParkingSpot)
async def checkout_vehicle(spot_id: str):
    """Check out a vehicle from a parking spot"""
    spot = await spots_collection.find_one({"id": spot_id})
    if not spot:
        raise HTTPException(status_code=404, detail="Parking spot not found")
    
    if spot["status"] != "occupied":
        raise HTTPException(status_code=400, detail="Parking spot is not occupied")
    
    update_data = {
        "is_occupied": False,
        "status": "available",
        "vehicle_license": None,
        "driver_name": None,
        "driver_phone": None,
        "exit_time": datetime.now(timezone.utc)
    }
    
    await spots_collection.update_one({"id": spot_id}, {"$set": update_data})
    updated_spot = await spots_collection.find_one({"id": spot_id})
    return ParkingSpot(**updated_spot)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)