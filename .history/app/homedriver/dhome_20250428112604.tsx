import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLocation } from '../location/GlobalLocation'; // Assuming you already made this hook

const { width, height } = Dimensions.get('window');

export default function DHome() {
  const { location } = useLocation(); // Getting location from your GlobalLocation
  const [isOnline, setIsOnline] = useState(false); // Driver availability

  const toggleSwitch = () => setIsOnline(previousState => !previousState);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        region={{
          latitude: location?.latitude || 13.9322,  // Default to Lucena
          longitude: location?.longitude || 121.6143,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation
      >
        {location && (
          <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} />
        )}
      </MapView>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Switch
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isOnline ? '#000' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleSwitch}
          value={isOnline}
        />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.statusText}>
            {isOnline ? "You're online.\nLooking for bookings....." : "You're offline."}
          </Text>
        </View>
      </View>

      {/* Future Ride Request Card Placeholder */}
      {/* <View style={styles.rideRequestCard}></View> */}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  statusBar: {
    position: 'absolute',
    bottom: 80,
    backgroundColor: '#81b0ff',
    width: width,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '500',
  },
  rideRequestCard: {
    position: 'absolute',
    top: 100, // We'll position this properly later
    alignSelf: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: width * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
});
