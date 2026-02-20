import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { getTariffRates, setTariffRates, type TariffRatesInput } from "../../lib/db";

const defaultRates: TariffRatesInput = {
  base_rate: 0,
  evening_supplement: 0,
  night_supplement: 0,
  weekend_supplement: 0,
  holiday_supplement: 0,
};

function toStr(n: number): string {
  return n === 0 ? "" : String(n);
}

function toNum(s: string): number {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

export default function SettingsScreen() {
  const [rates, setRates] = useState<TariffRatesInput>(defaultRates);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTariffRates()
      .then((row) => {
        if (!cancelled) {
          setRates({
            base_rate: row.base_rate,
            evening_supplement: row.evening_supplement,
            night_supplement: row.night_supplement,
            weekend_supplement: row.weekend_supplement,
            holiday_supplement: row.holiday_supplement,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setRates(defaultRates);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await setTariffRates(rates);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-gray-50"
    >
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text className="mb-4 text-sm text-gray-600">
          Timelønnsatser (f.eks. NOK). Brukes til å beregne forventet lønn.
        </Text>

        <RateField
          label="Grunnlønn"
          value={toStr(rates.base_rate)}
          onChangeText={(s) => setRates((r) => ({ ...r, base_rate: toNum(s) }))}
        />
        <RateField
          label="Kveldstillegg"
          value={toStr(rates.evening_supplement)}
          onChangeText={(s) =>
            setRates((r) => ({ ...r, evening_supplement: toNum(s) }))
          }
        />
        <RateField
          label="Nattillegg"
          value={toStr(rates.night_supplement)}
          onChangeText={(s) =>
            setRates((r) => ({ ...r, night_supplement: toNum(s) }))
          }
        />
        <RateField
          label="Helgetillegg"
          value={toStr(rates.weekend_supplement)}
          onChangeText={(s) =>
            setRates((r) => ({ ...r, weekend_supplement: toNum(s) }))
          }
        />
        <RateField
          label="Helligdagstillegg"
          value={toStr(rates.holiday_supplement)}
          onChangeText={(s) =>
            setRates((r) => ({ ...r, holiday_supplement: toNum(s) }))
          }
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={saving ? { opacity: 0.6 } : undefined}
          className="mt-6 rounded-lg bg-blue-600 py-3"
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-center font-medium text-white">Lagre</Text>
          )}
        </TouchableOpacity>

        {saved && (
          <Text
            className="mt-3 text-center text-green-600"
            accessibilityLiveRegion="polite"
          >
            Lagret.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RateField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-medium text-gray-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder="0"
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
      />
    </View>
  );
}
