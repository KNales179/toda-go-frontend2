# TODA-Go

TODA-Go is a mobile application developed as part of a digital tricycle transportation platform. It provides a mobile interface for users to access transportation-related services and interact with the TODA-Go system.

The application is built with React Native and Expo, with supporting services for location, mapping, notifications, media, authentication, and real-time communication.

## Overview

The application was developed to provide a mobile-first experience for tricycle transportation services.

It integrates with backend services through APIs and uses device capabilities such as location, camera, file storage, notifications, and media access to support its functionality.

## Technology Stack

### Mobile

* React Native
* Expo
* TypeScript
* Expo Router
* React Navigation

### Maps & Location

* React Native Maps
* Expo Location

### Backend & Communication

* Axios
* Socket.IO Client
* Firebase

### Device & Media

* Expo Camera
* React Native Vision Camera
* Expo Image Picker
* Expo Media Library
* Expo File System
* Expo Notifications
* Expo Clipboard
* Expo Haptics
* Expo Brightness

### UI & Device Integration

* React Native SVG
* Expo Blur
* React Native Reanimated
* React Native Gesture Handler
* React Native Safe Area Context
* React Native WebView

### Development & Testing

* Jest
* Jest Expo
* TypeScript
* ESLint
* Yarn

## Requirements

Before running the project, make sure the following are installed:

* Node.js 18 or later, below version 21
* Yarn 1.22.22
* Expo development environment
* Android Studio for Android development
* Xcode for iOS development

The project currently uses:

```text
Node.js >=18 <21
Yarn 1.22.22
Expo ~53
React Native 0.79.6
React 19
```

## Getting Started

Clone the repository:

```bash
git clone <repository-url>
```

Navigate to the project:

```bash
cd toda-go
```

Install dependencies:

```bash
yarn install
```

Start the Expo development server:

```bash
yarn start
```

## Running the Application

### Android

```bash
yarn android
```

### iOS

```bash
yarn ios
```

### Web

```bash
yarn web
```

The primary target of the project is mobile. Web support is available through Expo but is not the primary platform of the application.

## Testing

The project uses Jest with the Expo testing preset.

Run the test suite with:

```bash
yarn test
```

## Linting

Run the project's linting configuration with:

```bash
yarn lint
```

## Project Configuration

The application uses Expo Router as its entry point:

```text
expo-router/entry
```

Application configuration, platform settings, permissions, assets, and other Expo-specific settings are managed through the project's Expo configuration.

## Development

The application communicates with external backend services and makes use of device capabilities depending on the functionality being accessed.

Development configuration and environment-specific values should be kept outside the source code where appropriate.

Do not commit:

* API keys
* Authentication secrets
* Firebase credentials
* Private service configuration
* Production credentials
* Other sensitive environment-specific values

## Related Components

TODA-Go is part of a larger system consisting of multiple components, including mobile and administrative applications and their supporting backend services.

The mobile application communicates with the system's backend services through APIs and real-time connections where required.

## License

### Proprietary — All Rights Reserved

This repository is publicly available for **portfolio, educational, demonstration, and evaluation purposes**.

No permission is granted to copy, modify, reproduce, distribute, sublicense, publish, or use the source code or substantial portions of it for another project without prior written permission from the copyright holder.

Viewing and evaluating the source code through this repository does not grant ownership or any additional rights to the software.

Third-party libraries and dependencies included in or used by this project remain subject to their respective licenses.

For permission to use any portion of this project beyond viewing and evaluation, contact the copyright holder.

## Author

**IBell**
