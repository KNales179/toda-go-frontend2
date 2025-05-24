import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLocation  } from '../location/GlobalLocation'; // Your Global Location

const { width, height } = Dimensions.get('window');

export default function DHome() {
  const { location } = useLocation ();
  const [isOnline, setIsOnline] = useState(false);

  const toggleSwitch = () => setIsOnline(previousState => !previousState);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        region={{
          latitude: location?.latitude || 13.9322,
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

      {/* Driver Bottom Navigation */}
      <View style={styles.bottomNavbar}>
        <TouchableOpacity style={styles.navButton}>
          <Image source={require('../../assets/home.png')} style={styles.icon} />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Image source={require('../../assets/history.png')} style={styles.icon} />
          <Text style={styles.navText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Image source={require('../../assets/chat.png')} style={styles.icon} />
          <Text style={styles.navText}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Image source={require('../../assets/profile.png')} style={styles.icon} />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>

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
    bottom: 130,
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
  bottomNavbar: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'white',
    width: width,
    height: 80,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: 'black',
  },
  icon: {
    width: 24,
    height: 24,
  }
});
