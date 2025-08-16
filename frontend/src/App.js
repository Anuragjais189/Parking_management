import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Car, Search, Filter, Clock, DollarSign, MapPin, Phone, User, Calendar } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Separator } from './components/ui/separator';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [spots, setSpots] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);

  // Form states
  const [newSpot, setNewSpot] = useState({
    spot_number: '',
    spot_type: 'regular',
    hourly_rate: 5.0,
    status: 'available'
  });

  const [checkinData, setCheckinData] = useState({
    vehicle_license: '',
    driver_name: '',
    driver_phone: ''
  });

  const fetchSpots = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter && typeFilter !== 'all') params.append('spot_type', typeFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await axios.get(`${API_URL}/api/spots?${params}`);
      setSpots(response.data);
    } catch (error) {
      console.error('Error fetching spots:', error);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchSpots();
    fetchStats();
  }, [statusFilter, typeFilter, searchQuery]);

  const handleAddSpot = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/spots`, newSpot);
      setIsAddModalOpen(false);
      setNewSpot({ spot_number: '', spot_type: 'regular', hourly_rate: 5.0, status: 'available' });
      fetchSpots();
      fetchStats();
    } catch (error) {
      console.error('Error adding spot:', error);
      alert('Error adding parking spot');
    }
  };

  const handleEditSpot = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/api/spots/${selectedSpot.id}`, {
        spot_number: selectedSpot.spot_number,
        spot_type: selectedSpot.spot_type,
        hourly_rate: selectedSpot.hourly_rate,
        status: selectedSpot.status
      });
      setIsEditModalOpen(false);
      setSelectedSpot(null);
      fetchSpots();
      fetchStats();
    } catch (error) {
      console.error('Error updating spot:', error);
      alert('Error updating parking spot');
    }
  };

  const handleDeleteSpot = async (spotId) => {
    if (window.confirm('Are you sure you want to delete this parking spot?')) {
      try {
        await axios.delete(`${API_URL}/api/spots/${spotId}`);
        fetchSpots();
        fetchStats();
      } catch (error) {
        console.error('Error deleting spot:', error);
        alert('Error deleting parking spot');
      }
    }
  };

  const handleCheckin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/spots/${selectedSpot.id}/checkin`, checkinData);
      setIsCheckinModalOpen(false);
      setCheckinData({ vehicle_license: '', driver_name: '', driver_phone: '' });
      setSelectedSpot(null);
      fetchSpots();
      fetchStats();
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Error checking in vehicle');
    }
  };

  const handleCheckout = async (spotId) => {
    if (window.confirm('Are you sure you want to check out this vehicle?')) {
      try {
        await axios.post(`${API_URL}/api/spots/${spotId}/checkout`);
        fetchSpots();
        fetchStats();
      } catch (error) {
        console.error('Error checking out:', error);
        alert('Error checking out vehicle');
      }
    }
  };

  const getStatusColor = (status, spotType) => {
    const colors = {
      available: 'bg-green-100 text-green-800 border-green-200',
      occupied: 'bg-red-100 text-red-800 border-red-200',
      reserved: 'bg-blue-100 text-blue-800 border-blue-200',
      maintenance: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTypeIcon = (type) => {
    const icons = {
      regular: '🚗',
      handicap: '♿',
      vip: '⭐',
      electric: '🔋'
    };
    return icons[type] || '🚗';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <Car className="text-indigo-600" />
            Parking Management System
          </h1>
          <p className="text-slate-600">Manage parking spots, track availability, and handle vehicle check-ins</p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Spots</p>
                  <p className="text-3xl font-bold text-slate-800">{stats.total_spots || 0}</p>
                </div>
                <MapPin className="h-8 w-8 text-slate-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Available</p>
                  <p className="text-3xl font-bold text-green-700">{stats.available_spots || 0}</p>
                </div>
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="h-4 w-4 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Occupied</p>
                  <p className="text-3xl font-bold text-red-700">{stats.occupied_spots || 0}</p>
                </div>
                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                  <div className="h-4 w-4 bg-red-500 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Reserved</p>
                  <p className="text-3xl font-bold text-blue-700">{stats.reserved_spots || 0}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="h-4 w-4 bg-blue-500 rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Revenue</p>
                  <p className="text-3xl font-bold text-slate-800">${(stats.total_revenue || 0).toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-slate-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="mb-6 bg-white shadow-lg border-0">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="search"
                    placeholder="Search by spot number or license plate..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label>Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Type Filter</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="handicap">Handicap</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Spot
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Parking Spot</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddSpot} className="space-y-4">
                    <div>
                      <Label htmlFor="spot_number">Spot Number</Label>
                      <Input
                        id="spot_number"
                        value={newSpot.spot_number}
                        onChange={(e) => setNewSpot({...newSpot, spot_number: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="spot_type">Spot Type</Label>
                      <Select value={newSpot.spot_type} onValueChange={(value) => setNewSpot({...newSpot, spot_type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="handicap">Handicap</SelectItem>
                          <SelectItem value="vip">VIP</SelectItem>
                          <SelectItem value="electric">Electric</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                      <Input
                        id="hourly_rate"
                        type="number"
                        step="0.01"
                        value={newSpot.hourly_rate}
                        onChange={(e) => setNewSpot({...newSpot, hourly_rate: parseFloat(e.target.value)})}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                      Add Parking Spot
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Parking Spots List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading parking spots...</p>
            </div>
          ) : spots.length === 0 ? (
            <Card className="bg-white shadow-lg border-0">
              <CardContent className="p-12 text-center">
                <Car className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 mb-2">No parking spots found</h3>
                <p className="text-slate-500">Add your first parking spot to get started</p>
              </CardContent>
            </Card>
          ) : (
            spots.map((spot) => (
              <Card key={spot.id} className="bg-white shadow-lg border-0 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">{getTypeIcon(spot.spot_type)}</div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-slate-800">Spot {spot.spot_number}</h3>
                          <Badge className={`${getStatusColor(spot.status)} font-medium`}>
                            {spot.status.charAt(0).toUpperCase() + spot.status.slice(1)}
                          </Badge>
                          <Badge variant="outline" className="text-slate-600">
                            {spot.spot_type.charAt(0).toUpperCase() + spot.spot_type.slice(1)}
                          </Badge>
                        </div>
                        
                        {spot.is_occupied && (
                          <div className="space-y-1 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4" />
                              <span className="font-medium">{spot.vehicle_license}</span>
                            </div>
                            {spot.driver_name && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{spot.driver_name}</span>
                              </div>
                            )}
                            {spot.driver_phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{spot.driver_phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>Entry: {formatDateTime(spot.entry_time)}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>${spot.hourly_rate}/hour</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {spot.status === 'available' && (
                        <Button 
                          onClick={() => {
                            setSelectedSpot(spot);
                            setIsCheckinModalOpen(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Check In
                        </Button>
                      )}
                      
                      {spot.status === 'occupied' && (
                        <Button 
                          onClick={() => handleCheckout(spot.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Check Out
                        </Button>
                      )}

                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedSpot(spot);
                          setIsEditModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        onClick={() => handleDeleteSpot(spot.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Parking Spot</DialogTitle>
            </DialogHeader>
            {selectedSpot && (
              <form onSubmit={handleEditSpot} className="space-y-4">
                <div>
                  <Label htmlFor="edit_spot_number">Spot Number</Label>
                  <Input
                    id="edit_spot_number"
                    value={selectedSpot.spot_number}
                    onChange={(e) => setSelectedSpot({...selectedSpot, spot_number: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit_spot_type">Spot Type</Label>
                  <Select value={selectedSpot.spot_type} onValueChange={(value) => setSelectedSpot({...selectedSpot, spot_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="handicap">Handicap</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="electric">Electric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit_hourly_rate">Hourly Rate ($)</Label>
                  <Input
                    id="edit_hourly_rate"
                    type="number"
                    step="0.01"
                    value={selectedSpot.hourly_rate}
                    onChange={(e) => setSelectedSpot({...selectedSpot, hourly_rate: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit_status">Status</Label>
                  <Select value={selectedSpot.status} onValueChange={(value) => setSelectedSpot({...selectedSpot, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Update Parking Spot
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Check-in Modal */}
        <Dialog open={isCheckinModalOpen} onOpenChange={setIsCheckinModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Check In Vehicle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCheckin} className="space-y-4">
              <div>
                <Label htmlFor="vehicle_license">Vehicle License Plate *</Label>
                <Input
                  id="vehicle_license"
                  value={checkinData.vehicle_license}
                  onChange={(e) => setCheckinData({...checkinData, vehicle_license: e.target.value})}
                  required
                  placeholder="Enter license plate number"
                />
              </div>
              <div>
                <Label htmlFor="driver_name">Driver Name</Label>
                <Input
                  id="driver_name"
                  value={checkinData.driver_name}
                  onChange={(e) => setCheckinData({...checkinData, driver_name: e.target.value})}
                  placeholder="Enter driver name (optional)"
                />
              </div>
              <div>
                <Label htmlFor="driver_phone">Driver Phone</Label>
                <Input
                  id="driver_phone"
                  value={checkinData.driver_phone}
                  onChange={(e) => setCheckinData({...checkinData, driver_phone: e.target.value})}
                  placeholder="Enter phone number (optional)"
                />
              </div>
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Check In Vehicle
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default App;