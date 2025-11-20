import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";

// Mock de vérification DB (à remplacer plus tard par votre API Sense):
async function mockVerifyOnServer(scannedData) {
  // Simule une requête réseau (300–700ms)
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
  // Démo: 70% trouvé, 30% pas trouvé
  const found = Math.random() < 0.7;
  return { found };
}

export default function App() {
  const [screen, setScreen] = useState("home"); // 'home' | 'scanner'
  const [hasPermission, requestPermission] = useCameraPermissions();

  // États du scanner
  const [torch, setTorch] = useState(false); // flash off par défaut
  const [locked, setLocked] = useState(false); // debounce scan
  const [result, setResult] = useState(null); // { found: boolean, data: string, type: string }

  useEffect(() => {
    // Demande permission caméra au premier passage sur l'écran scanner
    if (screen === "scanner" && !hasPermission?.granted) {
      (async () => {
        await requestPermission();
      })();
    }
  }, [screen, hasPermission]);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (locked) return;
    setLocked(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { found } = await mockVerifyOnServer(data);
      setResult({ found, data, type });

      if (found) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      Alert.alert(
        "Erreur",
        "Impossible de vérifier le participant pour l'instant."
      );
      setResult({ found: false, data, type });
    } finally {
      // anti double-lecture: 1,2 s
      setTimeout(() => setLocked(false), 1200);
    }
  };

  const resetScan = () => {
    setResult(null);
    setLocked(false);
  };

  const onAddParticipant = () => {
    // Placeholder: à relier plus tard à votre écran/formulaire d’ajout
    Alert.alert(
      "Ajouter le participant",
      "Action à implémenter (ouvrir un formulaire ou API Sense).",
      [{ text: "OK" }]
    );
  };

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
          Scanne QR ou codes-barres de Sense Conseil pendant leurs évènements.
        </Text>
      </View>
    );
  }

  // Écran Scanner
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
        <Text>Autorise l’accès à la caméra pour scanner.</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={requestPermission}>
          <Text style={styles.scanBtnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch} // flash toggle
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          // QR + codes-barres courants
          barcodeTypes: [
            "qr",
            "ean13",
            "ean8",
            "code128",
            "code39",
            "upc_a",
            "upc_e",
            "pdf417",
            "datamatrix",
            "aztec",
          ],
        }}
      />
      {/* Overlay bas: commandes + résultat */}
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

        {!result && (
          <Text style={styles.overlayText}>Vise un code pour scanner…</Text>
        )}

        {result && (
          <View
            style={[
              styles.resultBox,
              result.found ? styles.okBox : styles.koBox,
            ]}
          >
            <Text style={styles.resultTitle}>
              {result.found
                ? "OK — Participant trouvé"
                : "Non trouvé — Pas sur la liste"}
            </Text>
            <Text style={styles.resultText} numberOfLines={2}>
              Type: {String(result.type)}
            </Text>
            <Text style={styles.resultText} numberOfLines={3}>
              Données: {String(result.data)}
            </Text>

            {result.found ? (
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={resetScan}
                >
                  <Text style={styles.secondaryBtnText}>Scanner à nouveau</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setScreen("home")}
                >
                  <Text style={styles.primaryBtnText}>Terminer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setScreen("home")}
                >
                  <Text style={styles.secondaryBtnText}>Quitter</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={onAddParticipant}
                >
                  <Text style={styles.primaryBtnText}>
                    Ajouter le participant
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
//css de l'application
const styles = StyleSheet.create({
  home: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 24 },
  scanBtn: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  scanBtnText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  hint: { marginTop: 16, color: "#6b7280" },

  container: { flex: 1, backgroundColor: "black" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  overlayText: { color: "white" },

  resultBox: { padding: 12, borderRadius: 10 },
  okBox: { backgroundColor: "rgba(34,197,94,0.9)" }, // vert
  koBox: { backgroundColor: "rgba(239,68,68,0.9)" }, // rouge
  resultTitle: { color: "white", fontWeight: "700", marginBottom: 6 },
  resultText: { color: "white" },

  primaryBtn: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 8,
  },
  primaryBtnText: { color: "white", fontWeight: "600" },
  secondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  secondaryBtnText: { color: "#111827", fontWeight: "600" },
  link: { color: "white", textDecorationLine: "underline" },
});
