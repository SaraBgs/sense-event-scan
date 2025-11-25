import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";

// Simulation locale de la base de données
const localDatabase = {
  "123456789": {
    nomprenom: "Jean Dupont",
    societe: "Sense Conseil",
    fonction: "Directeur Marketing",
    email: "jean.dupont@senseconseil.com",
    tel: "0123456789",
    event_evenement_id: 1,
    fk_event_cat_participant_id: 1
  },
  "987654321": {
    nomprenom: "Marie Martin",
    societe: "NTIC Mag",
    fonction: "Rédactrice en chef",
    email: "marie.martin@nticmag.com",
    tel: "0987654321",
    event_evenement_id: 1,
    fk_event_cat_participant_id: 1
  },
  "ABCDEF123": {
    nomprenom: "Ahmed Bensaid",
    societe: "GIE Monétique",
    fonction: "Responsable IT",
    email: "ahmed.bensaid@giemonetique.dz",
    tel: "0550123456",
    event_evenement_id: 12,
    fk_event_cat_participant_id: 1
  }
};

// Fonctions de validation
const validateEmail = (email) => {
  if (!email) return true; // Optionnel
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  if (!phone) return true; // Optionnel
  const phoneRegex = /^0[5-7][0-9]{8}$/;
  return phoneRegex.test(phone);
};

const validateName = (name) => {
  return name && name.trim().length >= 2;
};

// Simulation de vérification
async function verifyParticipant(scannedData) {
  await new Promise(resolve => setTimeout(resolve, 500));
  const participant = localDatabase[scannedData];
  
  if (participant) {
    return {
      found: true,
      participant: participant
    };
  } else {
    return { found: false };
  }
}

// Simulation d'ajout
async function addParticipant(qrCode, participantData) {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  localDatabase[qrCode] = {
    ...participantData,
    event_evenement_id: 1,
    fk_event_cat_participant_id: 1,
    create: new Date().toISOString()
  };
  
  return { success: true, message: "Participant ajouté avec succès" };
}

export default function App() {
  const [screen, setScreen] = useState("home"); // 'home' | 'scanner' | 'welcome' | 'accessDenied' | 'addParticipant'
  const [hasPermission, requestPermission] = useCameraPermissions();

  // États du scanner
  const [torch, setTorch] = useState(false);
  const [result, setResult] = useState(null);

  // États du formulaire d'ajout
  const [formData, setFormData] = useState({
    nomprenom: "",
    societe: "",
    fonction: "",
    email: "",
    tel: "",
  });

  const [formErrors, setFormErrors] = useState({
    nomprenom: "",
    email: "",
    tel: "",
  });

  useEffect(() => {
    if (screen === "scanner" && !hasPermission?.granted) {
      (async () => {
        await requestPermission();
      })();
    }
  }, [screen, hasPermission]);

  const handleBarCodeScanned = async ({ type, data }) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const apiResult = await verifyParticipant(data);
      
      if (apiResult.found) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setResult({
          found: true,
          participant: apiResult.participant,
          scannedData: data
        });
        setScreen("welcome");
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setResult({
          found: false,
          scannedData: data
        });
        setScreen("accessDenied");
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de vérifier le participant.");
    }
  };

  const resetScan = () => {
    setResult(null);
    setScreen("scanner");
  };

  const validateForm = () => {
    const errors = {
      nomprenom: validateName(formData.nomprenom) ? "" : "Nom et prénom requis (min 2 caractères)",
      email: validateEmail(formData.email) ? "" : "Format email invalide (ex: exemple@email.com)",
      tel: validatePhone(formData.tel) ? "" : "Format téléphone invalide (ex: 0550123456)"
    };
    
    setFormErrors(errors);
    return !errors.nomprenom && !errors.email && !errors.tel;
  };

  const handleAddParticipant = async () => {
    if (!validateForm()) {
      Alert.alert("Erreur de validation", "Veuillez corriger les erreurs dans le formulaire");
      return;
    }

    try {
      await addParticipant(result.scannedData, formData);
      Alert.alert(
        "Succès", 
        "Participant ajouté avec succès !",
        [{ text: "OK", onPress: () => {
          setScreen("home");
          // Reset du formulaire
          setFormData({
            nomprenom: "",
            societe: "",
            fonction: "",
            email: "",
            tel: "",
          });
          setFormErrors({
            nomprenom: "",
            email: "",
            tel: "",
          });
        }}]
      );
    } catch (error) {
      Alert.alert("Erreur", "Impossible d'ajouter le participant");
    }
  };

  const openAddParticipantScreen = () => {
    setScreen("addParticipant");
  };

  const updateFormField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Validation en temps réel
    if (field === "email" && value) {
      setFormErrors(prev => ({
        ...prev,
        email: validateEmail(value) ? "" : "Format email invalide"
      }));
    } else if (field === "tel" && value) {
      setFormErrors(prev => ({
        ...prev,
        tel: validatePhone(value) ? "" : "Doit commencer par 0 et avoir 10 chiffres"
      }));
    } else if (field === "nomprenom") {
      setFormErrors(prev => ({
        ...prev,
        nomprenom: validateName(value) ? "" : "Nom et prénom requis"
      }));
    }
  };

  // Écran d'accueil
  if (screen === "home") {
    return (
      <View style={styles.home}>
        <Text style={styles.title}>Sense Event Scan</Text>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => setScreen("scanner")}
        >
          <Text style={styles.scanBtnText}>Scanner</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Scannez les QR codes de test: {"\n"}
          123456789, 987654321, ABCDEF123
        </Text>
        <Text style={styles.demoHint}>
          Mode démo - Base locale simulée
        </Text>
      </View>
    );
  }

  // Écran Ajouter Participant
  if (screen === "addParticipant") {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={styles.formTitle}>Ajouter un Participant</Text>
          <Text style={styles.formSubtitle}>
            Code scanné: {result?.scannedData}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom et Prénom *</Text>
            <TextInput
              style={[styles.input, formErrors.nomprenom && styles.inputError]}
              value={formData.nomprenom}
              onChangeText={(text) => updateFormField("nomprenom", text)}
              placeholder="Ex: Jean Dupont"
              placeholderTextColor="#9ca3af"
            />
            {formErrors.nomprenom ? (
              <Text style={styles.errorText}>{formErrors.nomprenom}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Société</Text>
            <TextInput
              style={styles.input}
              value={formData.societe}
              onChangeText={(text) => updateFormField("societe", text)}
              placeholder="Ex: Sense Conseil"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fonction</Text>
            <TextInput
              style={styles.input}
              value={formData.fonction}
              onChangeText={(text) => updateFormField("fonction", text)}
              placeholder="Ex: Directeur Marketing"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, formErrors.email && styles.inputError]}
              value={formData.email}
              onChangeText={(text) => updateFormField("email", text)}
              placeholder="exemple@email.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {formErrors.email ? (
              <Text style={styles.errorText}>{formErrors.email}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={[styles.input, formErrors.tel && styles.inputError]}
              value={formData.tel}
              onChangeText={(text) => updateFormField("tel", text)}
              placeholder="0550123456"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              maxLength={10}
            />
            {formErrors.tel ? (
              <Text style={styles.errorText}>{formErrors.tel}</Text>
            ) : (
              <Text style={styles.hintText}>Doit commencer par 0 et avoir 10 chiffres</Text>
            )}
          </View>

          <View style={styles.formButtonRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setScreen("accessDenied")}
            >
              <Text style={styles.secondaryBtnText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, !formData.nomprenom && styles.disabledBtn]}
              onPress={handleAddParticipant}
              disabled={!formData.nomprenom}
            >
              <Text style={styles.primaryBtnText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Écran Bienvenue
  if (screen === "welcome" && result?.found) {
    return (
      <View style={styles.resultScreen}>
        <View style={[styles.resultBox, styles.okBox]}>
          <Text style={styles.resultTitle}>✅ Accès Autorisé</Text>
          <Text style={styles.welcomeText}>Bienvenue</Text>
          <Text style={styles.participantName}>
            {result.participant.nomprenom}
          </Text>
          {result.participant.societe && (
            <Text style={styles.participantInfo}>
              {result.participant.societe}
            </Text>
          )}
          {result.participant.fonction && (
            <Text style={styles.participantInfo}>
              {result.participant.fonction}
            </Text>
          )}
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={resetScan}
            >
              <Text style={styles.secondaryBtnText}>Scanner Suivant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setScreen("home")}
            >
              <Text style={styles.primaryBtnText}>Terminer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Écran Accès Refusé
  if (screen === "accessDenied" && !result?.found) {
    return (
      <View style={styles.resultScreen}>
        <View style={[styles.resultBox, styles.koBox]}>
          <Text style={styles.resultTitle}>❌ Accès Refusé</Text>
          <Text style={styles.deniedText}>
            Code: {result.scannedData}
          </Text>
          <Text style={styles.deniedText}>
            Participant non trouvé dans la base
          </Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={resetScan}
            >
              <Text style={styles.secondaryBtnText}>Scanner Suivant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={openAddParticipantScreen}
            >
              <Text style={styles.primaryBtnText}>Ajouter participant</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Gestion des permissions caméra
  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>Initialisation caméra…</Text>
      </View>
    );
  }
  
  if (!hasPermission.granted) {
    return (
      <View style={styles.center}>
        <Text>Autorise l'accès à la caméra pour scanner.</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={requestPermission}>
          <Text style={styles.scanBtnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Écran Scanner
  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: [
            "qr", "ean13", "ean8", "code128", "code39", 
            "upc_a", "upc_e", "pdf417", "datamatrix", "aztec"
          ],
        }}
      />
      
      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.row}>
          <TouchableOpacity onPress={() => setScreen("home")}>
            <Text style={styles.link}>Quitter</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <Text style={styles.overlayText}>Flash</Text>
            <Switch value={torch} onValueChange={setTorch} />
          </View>
        </View>

        <Text style={styles.overlayText}>
          Visez un code QR pour scanner...
        </Text>
        <Text style={styles.demoHintOverlay}>
          Scan infini activé - Codes de test: 123456789, 987654321, ABCDEF123
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  home: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  formContainer: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    color: "#111827",
  },
  formSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#374151",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#111827",
  },
  inputError: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 4,
  },
  hintText: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  formButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  disabledBtn: {
    opacity: 0.5,
  },

  title: { 
    fontSize: 24, 
    fontWeight: "700", 
    marginBottom: 24,
    color: "#111827"
  },
  scanBtn: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scanBtnText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "600" 
  },
  hint: { 
    marginTop: 16, 
    color: "#6b7280", 
    textAlign: "center",
    lineHeight: 20,
  },
  demoHint: {
    marginTop: 8,
    color: "#ef4444",
    fontSize: 12,
    fontStyle: "italic",
  },
  demoHintOverlay: {
    color: "white",
    fontSize: 10,
    fontStyle: "italic",
    marginTop: 4,
  },

  center: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
  },
  resultScreen: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8f9fa",
  },

  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  overlayText: { 
    color: "white",
    fontSize: 14,
  },

  resultBox: { 
    padding: 24, 
    borderRadius: 16,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  okBox: { backgroundColor: "#16a34a" },
  koBox: { backgroundColor: "#dc2626" },
  resultTitle: { 
    color: "white", 
    fontWeight: "700", 
    fontSize: 20,
    marginBottom: 16,
  },
  
  welcomeText: {
    color: "white",
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
  },
  participantName: {
    color: "white",
    fontSize: 20,
    fontWeight: "500",
    marginBottom: 8,
  },
  participantInfo: {
    color: "white",
    fontSize: 16,
    marginBottom: 4,
    textAlign: "center",
  },
  deniedText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
  },
  primaryBtn: {
    backgroundColor: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryBtnText: { 
    color: "white", 
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  secondaryBtnText: { 
    color: "#111827", 
    fontWeight: "600",
    fontSize: 14,
  },
  link: { 
    color: "white", 
    textDecorationLine: "underline",
    fontSize: 16,
  },
});