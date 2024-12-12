// backend/controllers/locationController.js

let devicesLocations = []; // Temporary in-memory store, replace with a database in production

exports.updateLocation = (req, res) => {
  const { deviceId, latitude, longitude } = req.body;
  devicesLocations = devicesLocations.filter(device => device.deviceId !== deviceId);
  devicesLocations.push({ deviceId, latitude, longitude });
  res.status(200).send('Location updated successfully');
};

exports.getAllLocations = (req, res) => {
  res.json(devicesLocations);
};
