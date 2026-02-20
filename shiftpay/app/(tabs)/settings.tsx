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
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { getTariffRates, setTariffRates, type TariffRatesInput } from "../../lib/db";
import { useTranslation, SUPPORTED_LOCALES, type Locale } from "../../lib/i18n";

const defaultRates: TariffRatesInput = {
  base_rate: 0,
  evening_supplement: 0,
  night_supplement: 0,
  weekend_supplement: 0,
  holiday_supplement: 0,
  overtime_supplement: 40,
};

function toStr(n: number): string {
  return n === 0 ? "" : String(n);
}

function toNum(s: string): number {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

const LOCALE_OPTIONS: { code: Locale; label: string }[] = [
  { code: "nb", label: "🇳🇴 Norsk" },
  { code: "en", label: "🇬🇧 English" },
  { code: "sv", label: "🇸🇪 Svenska" },
  { code: "da", label: "🇩🇰 Dansk" },
];

export default function SettingsScreen() {
  const { t, locale, setLocale } = useTranslation();
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
            overtime_supplement: row.overtime_supplement,
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
      <View className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator size="large" color="#0f766e" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-stone-50"
    >
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text className="mb-4 text-sm text-slate-500">
          {t("settings.description")}
        </Text>

        <RateField
          label={t("settings.labels.base")}
          value={toStr(rates.base_rate)}
          onChangeText={(s) => setRates((r) => ({ ...r, base_rate: toNum(s) }))}
        />
        <RateField
          label={t("settings.labels.evening")}
          value={toStr(rates.evening_supplement)}
          onChangeText={(s) =>
            setRates((r) => ({ ...r, evening_supplement: toNum(s) }))
          }
        />
        <RateField
          label={t("settings.labels.night")}
          value={toStr(rates.night_supplement)}
          onChangeText={(s) =>
            setRates((r) => ({ ...r, night_supplement: toNum(s) }))
          }
        />
        <RateField
          label={t("settings.labels.weekend")}
          value={toStr(rates.weekend_supplement)}
          onChangeText={(s) =>
            setRates((r) => ({ ...r, weekend_supplement: toNum(s) }))
          }
        />
        <RateField
          label={t("settings.labels.holiday")}
          value={toStr(rates.holiday_supplement)}
          onChangeText={(s) =>
            setRates((r) => ({ ...r, holiday_supplement: toNum(s) }))
          }
        />
        <RateField
          label={t("settings.labels.overtime")}
          value={toStr(rates.overtime_supplement)}
          onChangeText={(s) =>
            setRates((r) => ({ ...r, overtime_supplement: toNum(s) }))
          }
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={t("settings.save")}
          accessibilityState={{ disabled: saving }}
          style={saving ? { opacity: 0.6 } : undefined}
          className="mt-6 rounded-xl bg-teal-700 py-4"
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-center font-medium text-white">{t("settings.save")}</Text>
          )}
        </TouchableOpacity>

        {saved && (
          <Text
            className="mt-3 text-center text-green-600"
            accessibilityLiveRegion="polite"
          >
            {t("settings.saved")}
          </Text>
        )}

        {/* Language picker */}
        <View className="mt-8" accessibilityRole="radiogroup" accessibilityLabel={t("settings.language.title")}>
          <Text className="mb-3 text-sm font-medium text-slate-700" accessibilityRole="header">{t("settings.language.title")}</Text>
          {LOCALE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.code}
              onPress={() => setLocale(opt.code)}
              accessibilityRole="radio"
              accessibilityState={{ checked: locale === opt.code }}
              className="mb-2 flex-row items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3"
            >
              <Text className="text-slate-900">{opt.label}</Text>
              {locale === opt.code && (
                <Ionicons name="checkmark" size={20} color="#0f766e" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* About section */}
        <View className="mt-8 rounded-xl border border-stone-200 bg-white p-4">
          <Text className="mb-3 text-sm font-medium text-slate-700" accessibilityRole="header">{t("settings.about.title")}</Text>
          <Text className="mb-3 text-sm text-slate-500">{t("settings.about.description")}</Text>
          <Text className="mb-3 text-sm text-slate-500">{t("settings.about.privacy")}</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL("https://github.com/smlhus/shiftpay").catch(() => {})}
            accessibilityRole="link"
            accessibilityLabel="GitHub"
            className="mb-2 flex-row items-center gap-2"
            style={{ minHeight: 48 }}
          >
            <Ionicons name="logo-github" size={18} color="#0f766e" />
            <Text className="text-sm text-teal-700">GitHub</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL("mailto:shiftpay@smlhus.com").catch(() => {})}
            accessibilityRole="link"
            accessibilityLabel="shiftpay@smlhus.com"
            className="mb-3 flex-row items-center gap-2"
            style={{ minHeight: 48 }}
          >
            <Ionicons name="mail-outline" size={18} color="#0f766e" />
            <Text className="text-sm text-teal-700">shiftpay@smlhus.com</Text>
          </TouchableOpacity>
          <Text className="text-xs text-slate-500">ShiftPay v{Constants.expoConfig?.version ?? "1.0.0"}</Text>
        </View>
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
      <Text className="mb-1.5 text-sm font-medium text-slate-700">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder="0"
        accessibilityLabel={label}
        className="min-h-[48px] rounded-xl border border-stone-300 bg-white px-4 py-3 text-slate-900"
      />
    </View>
  );
}
