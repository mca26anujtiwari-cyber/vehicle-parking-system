import React, { useEffect, useRef, useState } from "react";
import TwoWheelerParkingScreen from '../screens/TwoWheelerParkingScreen';
import FourWheelerParkingScreen from '../screens/FourWheelerParkingScreen';
import { apiLogin, apiRegister, apiGetAdminSummary } from './api';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// COLORS
const YELLOW = "#F5B51B";
const BROWN = "#654719";
const CREAM = "#FFF2D5";
const WHITE = "#FFFFFF";

type VehicleType = "2 Wheeler" | "4 Wheeler";

type Account = {
  username: string;
  email: string;
  phone: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
};

type Screen =
  | "splash"
  | "role"
  | "admin"
  | "user"
  | "adminHome"
  | "userHome";

// LOGO
function Logo({ size = 1 }: { size?: number }) {
  return (
    <View style={styles.logoContainer}>
      <Text style={[styles.cloud, { fontSize: 39 * size }]}>☁</Text>
      <Text style={[styles.logoP, { fontSize: 73 * size }]}>P</Text>
      <Text style={[styles.logoTitle, { fontSize: 25 * size }]}>
        EasyPark
      </Text>
      <Text style={[styles.logoSubtitle, { fontSize: 10 * size }]}>
        PARKING SYSTEM
      </Text>
    </View>
  );
}

// INPUT FIELD
function InputField({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  maxLength,
}: {
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "characters" | "words";
  maxLength?: number;
}) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      maxLength={maxLength}
    />
  );
}

// YELLOW BUTTON
function MainButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.mainButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.mainButtonText}>{title}</Text>
    </TouchableOpacity>
  );
}

// VEHICLE TYPE SELECTOR
function VehicleSelector({
  selected,
  onSelect,
}: {
  selected: VehicleType | "";
  onSelect: (type: VehicleType) => void;
}) {
  return (
    <View style={styles.vehicleSection}>
      <Text style={styles.fieldLabel}>Select Vehicle Type</Text>

      <View style={styles.vehicleRow}>
        {(["2 Wheeler", "4 Wheeler"] as VehicleType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.vehicleButton,
              selected === type && styles.vehicleSelected,
            ]}
            onPress={() => onSelect(type)}
          >
            <Text
              style={[
                styles.vehicleText,
                selected === type && styles.vehicleSelectedText,
              ]}
            >
              {type === "2 Wheeler" ? "🏍️" : "🚗"}
              {"\n"}
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// MAIN APP
export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");

  // PARKING SCREEN NAVIGATION
  const [activeParkingScreen, setActiveParkingScreen] =
    useState<VehicleType | null>(null);

  // ADMIN
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // USER FORM
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // SAVED DEMO ACCOUNT
  const [account, setAccount] = useState<Account | null>(null);
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [adminSummary, setAdminSummary] = useState<any>(null);

  // SPLASH ANIMATION
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.2,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => setScreen("role"), 2800);

    return () => clearTimeout(timer);
  }, []);

  // LOAD REGISTERED PROFILE
  useEffect(() => {
    const loadAccount = async () => {
      try {
        const saved = await AsyncStorage.getItem("easypark_profile");

        if (saved) {
          setAccount(JSON.parse(saved) as Account);
        }
      } catch {
        Alert.alert("Error", "Could not load the saved user profile.");
      } finally {
        setAccountLoaded(true);
      }
    };

    loadAccount();
  }, []);

  // RESET USER FORM
  const resetUserForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setPhone("");
    setVehicleType("");
    setVehicleNumber("");
    setShowPassword(false);
  };

  // ADMIN LOGIN (Connected to Spring Boot + SQL Database)
  const adminLogin = async () => {
    if (!adminUsername.trim() || !adminPassword) {
      Alert.alert(
        "Missing Details",
        "Enter your admin username and password."
      );
      return;
    }

    try {
      const data = await apiLogin({
        username: adminUsername.trim(),
        password: adminPassword,
      });
      if (data.user?.role !== "ADMIN") {
        Alert.alert("Access Denied", "This account is not an Admin.");
        return;
      }
      try {
        const summary = await apiGetAdminSummary();
        setAdminSummary(summary);
      } catch {}
      setScreen("adminHome");
      setAdminUsername("");
      setAdminPassword("");
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Could not connect to backend.");
    }
  };

  // VALIDATE VEHICLE NUMBER
  const validateVehicleNumber = (number: string) => {
    const cleaned = number.toUpperCase().replace(/[\s-]/g, "");

    return /^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/.test(cleaned);
  };

  // VALIDATE EMAIL FORMAT
  const validateEmail = (value: string) => {
    const normalizedEmail = value.trim().toLowerCase();

    const emailPattern =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

    const emailParts = normalizedEmail.split("@");
    const emailDomain = emailParts[1] ?? "";
    const domainLabels = emailDomain.split(".");

    const invalidDomain =
      !emailPattern.test(normalizedEmail) ||
      normalizedEmail.length > 254 ||
      emailParts[0].length > 64 ||
      domainLabels.some(
        (label) =>
          !label ||
          label.length > 63 ||
          label.startsWith("-") ||
          label.endsWith("-")
      ) ||
      domainLabels[domainLabels.length - 1].length < 2;

    return !invalidDomain;
  };

  // USER REGISTRATION
  const registerUser = async () => {
    if (
      !username.trim() ||
      !email.trim() ||
      !password ||
      !phone ||
      !vehicleType ||
      !vehicleNumber.trim()
    ) {
      Alert.alert(
        "Missing Details",
        "Please fill in all registration fields."
      );
      return;
    }

    // USERNAME VALIDATION
    if (username.trim().length < 3) {
      Alert.alert(
        "Invalid Username",
        "Username must have at least 3 characters."
      );
      return;
    }

    // EMAIL VALIDATION
    const normalizedEmail = email.trim().toLowerCase();

    if (!validateEmail(normalizedEmail)) {
      Alert.alert(
        "Invalid Email",
        "Enter a valid email address, for example name@example.com."
      );
      return;
    }

    // PHONE VALIDATION
    if (!/^[6-9]\d{9}$/.test(phone)) {
      Alert.alert(
        "Invalid Phone Number",
        "Phone number must contain exactly 10 digits and start with 6, 7, 8 or 9."
      );
      return;
    }

    // PASSWORD VALIDATION
    if (password.length < 8) {
      Alert.alert(
        "Weak Password",
        "Password must contain at least 8 characters."
      );
      return;
    }

    // VEHICLE NUMBER VALIDATION
    if (!validateVehicleNumber(vehicleNumber)) {
      Alert.alert(
        "Invalid Vehicle Number",
        "Enter a valid vehicle number, for example MH02AB1234."
      );
      return;
    }

    // DUPLICATE USERNAME CHECK
    if (
      account &&
      account.username.toLowerCase() === username.trim().toLowerCase()
    ) {
      Alert.alert(
        "Username Exists",
        "This username is already registered."
      );
      return;
    }

    // DUPLICATE EMAIL CHECK
    if (
      account &&
      account.email.toLowerCase() === normalizedEmail
    ) {
      Alert.alert(
        "Email Exists",
        "This email is already registered."
      );
      return;
    }

    const newAccount: Account = {
      username: username.trim(),
      email: normalizedEmail,
      phone: phone,
      vehicleType,
      vehicleNumber: vehicleNumber
        .toUpperCase()
        .replace(/[\s-]/g, ""),
    };

    try {
      await apiRegister({
        username: newAccount.username,
        email: newAccount.email,
        phone: newAccount.phone,
        password,
        vehicleType: newAccount.vehicleType,
        vehicleNumber: newAccount.vehicleNumber,
      });

      await AsyncStorage.setItem(
        "easypark_profile",
        JSON.stringify(newAccount)
      );

      await SecureStore.setItemAsync(
        "easypark_demo_password",
        password
      );

      setAccount(newAccount);
      setPassword("");
      setActiveParkingScreen(newAccount.vehicleType);

      Alert.alert(
        "Registration Successful",
        "Saved to Spring Boot SQL Database! Welcome to EasyPark!"
      );
    } catch (err: any) {
      Alert.alert(
        "Registration Failed",
        err.message || "Could not save your registration to the backend."
      );
    }
  };

  // EXISTING USER LOGIN
  const loginUser = async () => {
    if (!accountLoaded) {
      Alert.alert(
        "Please Wait",
        "Loading your account."
      );
      return;
    }

    if (
      !username.trim() ||
      !password ||
      !vehicleType ||
      !vehicleNumber.trim()
    ) {
      Alert.alert(
        "Missing Details",
        "Please fill in all login fields."
      );
      return;
    }

    if (!validateVehicleNumber(vehicleNumber)) {
      Alert.alert(
        "Invalid Vehicle Number",
        "Enter a valid vehicle number."
      );
      return;
    }

    try {
      const data = await apiLogin({
        username: username.trim(),
        password,
        vehicleType,
        vehicleNumber: vehicleNumber.toUpperCase().replace(/[\s-]/g, ""),
      });

      const loggedUser: Account = {
        username: data.user.username,
        email: data.user.email || "",
        phone: data.user.phone || "",
        vehicleType: (data.user.vehicleType as VehicleType) || (vehicleType as VehicleType),
        vehicleNumber: data.user.vehicleNumber || vehicleNumber.toUpperCase().replace(/[\s-]/g, ""),
      };

      setAccount(loggedUser);
      setPassword("");
      setActiveParkingScreen(loggedUser.vehicleType);

      Alert.alert(
        "Login Successful",
        `Welcome back, ${loggedUser.username}!`
      );
    } catch (err: any) {
      Alert.alert(
        "Account Not Found / Login Failed",
        (err.message || "Invalid username or password.") + "\n\nNaya account banana hai? Register page pe jaayein.",
        [
          { text: "Try Again", style: "cancel" },
          {
            text: "Go to Register",
            onPress: () => {
              setIsSignUp(true);
              setPassword("");
            },
          },
        ]
      );
    }
  };

  // GOOGLE LOGIN
  const googleLogin = () => {
    Alert.alert(
      "Google Sign-In Setup",
      "Google sign-in requires a Google OAuth Client ID and authentication configuration. We can connect this after setting up your Google project."
    );
  };

  // LOGOUT
  const logout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: () => {
            resetUserForm();
            setActiveParkingScreen(null);
            setScreen("role");
          },
        },
      ]
    );
  };

  // SHOW THE SELECTED PARKING SCREEN
  if (activeParkingScreen === "2 Wheeler") {
    return (
      <TwoWheelerParkingScreen
        vehicleNumber={account?.vehicleNumber || vehicleNumber || ""}
        onBack={() => {
          setActiveParkingScreen(null);
          setScreen("userHome");
        }}
      />
    );
  }

  if (activeParkingScreen === "4 Wheeler") {
    return (
      <FourWheelerParkingScreen
        vehicleNumber={account?.vehicleNumber || vehicleNumber || ""}
        onBack={() => {
          setActiveParkingScreen(null);
          setScreen("userHome");
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* 1. SPLASH SCREEN */}
      {screen === "splash" && (
        <LinearGradient
          colors={["#FFF4D9", "#FFE5A8"]}
          style={styles.splash}
        >
          <Animated.View
            style={{
              opacity,
              transform: [{ scale }],
              alignItems: "center",
            }}
          >
            <Logo size={1.45} />
          </Animated.View>

          <View style={styles.splashWave1} />
          <View style={styles.splashWave2} />
        </LinearGradient>
      )}

      {/* 2. ROLE SELECTION */}
      {screen === "role" && (
        <View style={styles.roleScreen}>
          <View style={styles.roleCard}>
            <Logo size={0.85} />

            <Text style={styles.heading}>Choose Your Role</Text>

            <Text style={styles.description}>
              Welcome. Please select your{"\n"}role to continue.
            </Text>

            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => setScreen("admin")}
            >
              <Text style={styles.adminButtonText}>
                🔑 ADMIN
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.userButton}
              onPress={() => {
                setIsSignUp(false);
                resetUserForm();
                setScreen("user");
              }}
            >
              <Text style={styles.userButtonText}>
                👤 USER
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.roleWave1} />
          <View style={styles.roleWave2} />
        </View>
      )}

      {/* 3. ADMIN LOGIN */}
      {screen === "admin" && (
        <View style={styles.authScreen}>
          <LinearGradient
            colors={[YELLOW, "#E9A710"]}
            style={styles.authHeader}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setScreen("role")}
            >
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>

            <Text style={styles.authHeading}>
              Admin Login
            </Text>

            <View style={styles.authWave1} />
          </LinearGradient>

          <View style={styles.authCard}>
            <Logo size={0.8} />

            <View style={styles.form}>
              <InputField
                placeholder="Admin Username"
                value={adminUsername}
                onChangeText={setAdminUsername}
                autoCapitalize="none"
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  value={adminPassword}
                  onChangeText={setAdminPassword}
                  secureTextEntry={!showAdminPassword}
                />

                <TouchableOpacity
                  onPress={() =>
                    setShowAdminPassword(!showAdminPassword)
                  }
                >
                  <Text style={styles.showText}>
                    {showAdminPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.demoHint}>
                Demo admin username: admin{"\n"}
                Demo admin password: admin123
              </Text>

              <MainButton
                title="Log In"
                onPress={adminLogin}
              />
            </View>
          </View>
        </View>
      )}

      {/* 4. USER LOGIN AND REGISTRATION */}
      {screen === "user" && (
        <KeyboardAvoidingView
          style={styles.authScreen}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <LinearGradient
            colors={[YELLOW, "#E9A710"]}
            style={styles.userHeader}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setScreen("role")}
            >
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => {
                setIsSignUp(!isSignUp);
                resetUserForm();
              }}
            >
              <Text style={styles.registerText}>
                {isSignUp ? "Sign In" : "Register"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.authHeading}>
              {isSignUp ? "Create Account" : "Welcome User"}
            </Text>

            <View style={styles.authWave1} />
          </LinearGradient>

          <ScrollView
            style={styles.userCardScroll}
            contentContainerStyle={styles.userCard}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Logo size={0.75} />

            <Text style={styles.welcomeText}>
              {isSignUp
                ? "Register to start using EasyPark."
                : "Welcome to EasyPark Parking System.\nLog in to continue."}
            </Text>

            {isSignUp ? (
              <>
                <InputField
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />

                <InputField
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />

                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password (minimum 8 characters)"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />

                  <TouchableOpacity
                    onPress={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    <Text style={styles.showText}>
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <InputField
                  placeholder="Phone Number (10 digits)"
                  value={phone}
                  onChangeText={(value) =>
                    setPhone(value.replace(/\D/g, "").slice(0, 10))
                  }
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </>
            ) : (
              <>
                <InputField
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                />

                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />

                  <TouchableOpacity
                    onPress={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    <Text style={styles.showText}>
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <VehicleSelector
              selected={vehicleType}
              onSelect={setVehicleType}
            />

            <InputField
              placeholder="Vehicle Number (e.g. MH02AB1234)"
              value={vehicleNumber}
              onChangeText={(value) =>
                setVehicleNumber(value.toUpperCase())
              }
              autoCapitalize="characters"
            />

            <MainButton
              title={isSignUp ? "Create Account" : "Sign In"}
              onPress={isSignUp ? registerUser : loginUser}
            />

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => {
                setIsSignUp(!isSignUp);
                resetUserForm();
              }}
            >
              <Text style={styles.switchText}>
                {isSignUp
                  ? "Already registered? Sign In"
                  : "New to EasyPark? Sign Up"}
              </Text>
            </TouchableOpacity>

            {!isSignUp && (
              <>
                <View style={styles.orContainer}>
                  <View style={styles.line} />
                  <Text style={styles.orText}>Or</Text>
                  <View style={styles.line} />
                </View>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={googleLogin}
                >
                  <Text style={styles.googleText}>G</Text>
                  <Text style={styles.socialText}>
                    Continue with Google
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ADMIN DASHBOARD PLACEHOLDER */}
      {screen === "adminHome" && (
        <View style={styles.homeScreen}>
          <Logo size={1} />

          <Text style={styles.homeHeading}>
            Admin Dashboard
          </Text>

          <Text style={styles.homeDescription}>
            Welcome, Admin! Connected to Spring Boot + JDBC Database.
          </Text>
          {adminSummary && (
            <View style={styles.profileCard}>
              <Text style={styles.profileTitle}>Live Database Summary</Text>
              <Text style={styles.profileText}>Active Parked: {adminSummary.activeParkedCount}</Text>
              <Text style={styles.profileText}>4W Available: {adminSummary.availableFourWheelerCount} / 18</Text>
              <Text style={styles.profileText}>2W Available: {adminSummary.availableTwoWheelerCount} / 72</Text>
              <Text style={styles.profileText}>Total Revenue: ₹{adminSummary.totalRevenue}</Text>
            </View>
          )}

          <MainButton
            title="Logout"
            onPress={logout}
          />
        </View>
      )}

      {/* USER DASHBOARD PLACEHOLDER */}
      {screen === "userHome" && (
        <View style={styles.homeScreen}>
          <Logo size={1} />

          <Text style={styles.homeHeading}>
            Welcome to EasyPark!
          </Text>

          {account && (
            <View style={styles.profileCard}>
              <Text style={styles.profileTitle}>
                Your Profile
              </Text>

              <Text style={styles.profileText}>
                Username: {account.username}
              </Text>

              <Text style={styles.profileText}>
                Email: {account.email}
              </Text>

              <Text style={styles.profileText}>
                Phone: {account.phone}
              </Text>

              <Text style={styles.profileText}>
                Vehicle: {account.vehicleType}
              </Text>

              <Text style={styles.profileText}>
                Number: {account.vehicleNumber}
              </Text>
            </View>
          )}

          <MainButton
            title="Logout"
            onPress={logout}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

// STYLES
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CREAM,
  },

  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  cloud: {
    color: BROWN,
    marginBottom: -15,
  },

  logoP: {
    color: YELLOW,
    fontWeight: "900",
    lineHeight: 80,
    textShadowColor: BROWN,
    textShadowOffset: { width: 1.5, height: 2 },
    textShadowRadius: 1,
  },

  logoTitle: {
    color: BROWN,
    fontWeight: "900",
    marginTop: 5,
  },

  logoSubtitle: {
    color: BROWN,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 3,
  },

  splashWave1: {
    position: "absolute",
    width: 500,
    height: 260,
    backgroundColor: YELLOW,
    bottom: -170,
    left: -90,
    borderRadius: 180,
    transform: [{ rotate: "-12deg" }],
  },

  splashWave2: {
    position: "absolute",
    width: 450,
    height: 180,
    backgroundColor: "#F9C84F",
    bottom: -125,
    right: -140,
    borderRadius: 150,
    transform: [{ rotate: "12deg" }],
  },

  roleScreen: {
    flex: 1,
    backgroundColor: CREAM,
    justifyContent: "center",
    paddingHorizontal: 24,
    overflow: "hidden",
  },

  roleCard: {
    backgroundColor: WHITE,
    borderRadius: 28,
    padding: 30,
    alignItems: "center",
    elevation: 7,
    zIndex: 2,
  },

  heading: {
    fontSize: 23,
    fontWeight: "800",
    color: "#171717",
    marginTop: 30,
  },

  description: {
    color: "#333",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 28,
  },

  adminButton: {
    width: "100%",
    backgroundColor: YELLOW,
    borderRadius: 30,
    padding: 15,
    alignItems: "center",
    marginBottom: 12,
  },

  adminButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#292018",
  },

  userButton: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#D6AD43",
    borderRadius: 30,
    padding: 13,
    alignItems: "center",
  },

  userButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#292018",
  },

  roleWave1: {
    position: "absolute",
    width: 420,
    height: 180,
    backgroundColor: YELLOW,
    bottom: -110,
    left: -120,
    borderRadius: 150,
  },

  roleWave2: {
    position: "absolute",
    width: 350,
    height: 130,
    backgroundColor: "#F9C84F",
    bottom: -90,
    right: -130,
    borderRadius: 150,
  },

  authScreen: {
    flex: 1,
    backgroundColor: CREAM,
  },

  authHeader: {
    height: "35%",
    paddingHorizontal: 25,
    paddingTop: 30,
    overflow: "hidden",
  },

  userHeader: {
    height: "30%",
    paddingHorizontal: 25,
    paddingTop: 30,
    overflow: "hidden",
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    zIndex: 3,
  },

  backText: {
    fontSize: 38,
    color: BROWN,
    lineHeight: 42,
  },

  authHeading: {
    fontSize: 25,
    fontWeight: "900",
    color: "#191919",
    marginTop: 20,
    zIndex: 2,
  },

  authWave1: {
    position: "absolute",
    width: 400,
    height: 170,
    backgroundColor: "#F9C84F",
    bottom: -105,
    left: -100,
    borderRadius: 180,
  },

  authCard: {
    flex: 1,
    backgroundColor: WHITE,
    marginTop: -10,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    alignItems: "center",
    paddingTop: 25,
    paddingHorizontal: 28,
  },

  form: {
    width: "100%",
    marginTop: 35,
  },

  input: {
    backgroundColor: "#F1F1F1",
    borderRadius: 30,
    height: 50,
    marginBottom: 12,
    paddingHorizontal: 20,
    color: "#222",
    fontSize: 14,
    width: "100%",
  },

  passwordContainer: {
    backgroundColor: "#F1F1F1",
    borderRadius: 30,
    height: 50,
    marginBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },

  passwordInput: {
    flex: 1,
    color: "#222",
    fontSize: 14,
    height: "100%",
  },

  showText: {
    color: BROWN,
    fontSize: 12,
    fontWeight: "700",
  },

  demoHint: {
    fontSize: 12,
    color: BROWN,
    lineHeight: 20,
    marginBottom: 15,
  },

  mainButton: {
    backgroundColor: YELLOW,
    borderRadius: 30,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    width: "100%",
  },

  mainButtonText: {
    color: "#211A10",
    fontWeight: "800",
    fontSize: 15,
  },

  registerButton: {
    position: "absolute",
    top: 37,
    right: 27,
    zIndex: 4,
  },

  registerText: {
    color: "#282018",
    fontWeight: "700",
    fontSize: 13,
  },

  userCardScroll: {
    flex: 1,
    marginTop: -15,
    backgroundColor: WHITE,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    zIndex: 2,
  },

  userCard: {
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 25,
    paddingBottom: 40,
  },

  welcomeText: {
    fontSize: 13,
    textAlign: "center",
    color: "#333",
    lineHeight: 20,
    marginTop: 16,
    marginBottom: 20,
  },

  vehicleSection: {
    width: "100%",
    marginBottom: 14,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: BROWN,
    marginBottom: 10,
  },

  vehicleRow: {
    flexDirection: "row",
    gap: 12,
  },

  vehicleButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#D6AD43",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    backgroundColor: WHITE,
  },

  vehicleSelected: {
    backgroundColor: YELLOW,
    borderColor: YELLOW,
  },

  vehicleText: {
    fontSize: 14,
    color: BROWN,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "600",
  },

  vehicleSelectedText: {
    color: "#211A10",
    fontWeight: "800",
  },

  switchButton: {
    marginTop: 16,
    marginBottom: 8,
  },

  switchText: {
    fontSize: 13,
    color: BROWN,
    fontWeight: "700",
  },

  orContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 17,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#DDD",
  },

  orText: {
    color: "#777",
    paddingHorizontal: 15,
    fontSize: 13,
  },

  socialButton: {
    width: "100%",
    height: 47,
    borderWidth: 1,
    borderColor: "#D6D6D6",
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  googleText: {
    fontSize: 21,
    fontWeight: "900",
    color: "#4285F4",
    marginRight: 13,
  },

  socialText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222",
  },

  homeScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
    backgroundColor: CREAM,
  },

  homeHeading: {
    fontSize: 25,
    fontWeight: "900",
    color: BROWN,
    marginTop: 30,
    marginBottom: 12,
    textAlign: "center",
  },

  homeDescription: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginBottom: 25,
  },

  profileCard: {
    backgroundColor: WHITE,
    width: "100%",
    borderRadius: 20,
    padding: 20,
    marginVertical: 20,
    elevation: 3,
  },

  profileTitle: {
    color: BROWN,
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 12,
  },

  profileText: {
    color: "#333",
    fontSize: 14,
    marginBottom: 9,
  },
});