import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
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
                style={{ marginRight: 10 }}
                trackColor={{ false: '#ccc', true: 'black' }}
                thumbColor="white"
                ios_backgroundColor="black"
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
        <View style={styles.bottomNav}>
            <TouchableOpacity>
                <Ionicons name="home" size={30} color="black" />
                <Text>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity>
                <Ionicons name="document-text-outline" size={30} color="black" />
                <Text>History</Text>
            </TouchableOpacity>
            <TouchableOpacity>
                <Ionicons name="chatbubbles-outline" size={30} color="black" />
                <Text>Chats</Text>
            </TouchableOpacity>
            <TouchableOpacity>
                <Ionicons name="person-outline" size={30} color="black" />
                <Text>Profile</Text>
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
    bottom: 75,
    backgroundColor: '#80C3E1',
    width: width,
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: 'black',
    fontSize: 14,
    fontWeight: '500',
  },
  switch: {
    transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }], // make the switch bigger like in your PNG
    marginRight: 10,
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
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    width: width,
    height: 70,
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "black",
  }
  
});
