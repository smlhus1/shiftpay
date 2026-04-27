import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { useForm, Controller, type Control } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import * as v from "valibot";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { getTariffRates, setTariffRates, STACKING_POLICIES, type TariffRatesInput } from "@/lib/db";
import { useTranslation, type Locale, type Currency } from "@/lib/i18n";
import { PressableScale } from "@/components/PressableScale";
import { useTheme, useThemeColors, type ThemePreference } from "@/lib/theme-context";

const defaultRates: TariffRatesInput = {
  base_rate: 0,
  evening_supplement: 0,
  night_supplement: 0,
  weekend_supplement: 0,
  holiday_supplement: 0,
  overtime_supplement: 40,
  regular_period_start_day: 1,
  extra_period_start_day: 12,
  stacking_policy: "additive",
};

// Boundary schema — kept narrow on purpose. setTariffRates already clamps
// negatives, but validating at the form layer means the Save button stays
// disabled (and the RHF errors render) instead of silently rounding bad
// input up to 0 on save.
const tariffFormSchema = v.object({
  base_rate: v.pipe(v.number(), v.minValue(0)),
  evening_supplement: v.pipe(v.number(), v.minValue(0)),
  night_supplement: v.pipe(v.number(), v.minValue(0)),
  weekend_supplement: v.pipe(v.number(), v.minValue(0)),
  holiday_supplement: v.pipe(v.number(), v.minValue(0)),
  overtime_supplement: v.pipe(v.number(), v.minValue(0)),
  regular_period_start_day: v.pipe(v.number(), v.minValue(1), v.maxValue(28)),
  extra_period_start_day: v.pipe(v.number(), v.minValue(1), v.maxValue(28)),
  stacking_policy: v.picklist(["additive", "replace", "max"] as const),
});

function toStr(n: number): string {
  return n === 0 ? "" : String(n);
}

function toNum(s: string): number {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

const LOCALE_OPTIONS: { code: Locale; label: string }[] = [
  { code: "nb", label: "Norsk" },
  { code: "en", label: "English" },
  { code: "sv", label: "Svenska" },
  { code: "da", label: "Dansk" },
];

const CURRENCY_OPTIONS: { code: Currency; label: string; symbol: string }[] = [
  { code: "NOK", label: "NOK", symbol: "kr" },
  { code: "GBP", label: "GBP", symbol: "£" },
  { code: "SEK", label: "SEK", symbol: "kr" },
  { code: "DKK", label: "DKK", symbol: "kr" },
  { code: "EUR", label: "EUR", symbol: "€" },
];

const THEME_OPTIONS: { value: ThemePreference; icon: string }[] = [
  { value: "system", icon: "phone" },
  { value: "light", icon: "sun" },
  { value: "dark", icon: "moon" },
];

type NumericFieldName =
  | "base_rate"
  | "evening_supplement"
  | "night_supplement"
  | "weekend_supplement"
  | "holiday_supplement"
  | "overtime_supplement"
  | "regular_period_start_day"
  | "extra_period_start_day";

export default function SettingsScreen() {
  const { t, locale, setLocale, currency, setCurrency } = useTranslation();
  const { preference, setPreference } = useTheme();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showPayPeriods, setShowPayPeriods] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<TariffRatesInput>({
    resolver: valibotResolver(tariffFormSchema),
    defaultValues: defaultRates,
  });

  useEffect(() => {
    let cancelled = false;
    getTariffRates()
      .then((row) => {
        if (cancelled) return;
        reset({
          base_rate: row.base_rate,
          evening_supplement: row.evening_supplement,
          night_supplement: row.night_supplement,
          weekend_supplement: row.weekend_supplement,
          holiday_supplement: row.holiday_supplement,
          overtime_supplement: row.overtime_supplement,
          regular_period_start_day: row.regular_period_start_day,
          extra_period_start_day: row.extra_period_start_day,
          stacking_policy: row.stacking_policy,
        });
      })
      .catch(() => {
        if (!cancelled) reset(defaultRates);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reset]);

  const onSubmit = handleSubmit(async (data) => {
    await setTariffRates(data);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg dark:bg-dark-bg">
        <ActivityIndicator
          size="large"
          color={colors.accent}
          accessibilityLabel={t("common.loading")}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-app-bg dark:bg-dark-bg"
    >
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text className="mb-4 text-sm text-stone-600 dark:text-stone-400">
          {t("settings.description")}
        </Text>

        {/* Base pay section */}
        <Text
          className="mb-3 font-inter-medium text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400"
          accessibilityRole="header"
        >
          {t("settings.sections.basePay")}
        </Text>
        <NumericField
          control={control}
          name="base_rate"
          label={t("settings.labels.base")}
          suffix="kr/t"
          placeholder="250"
        />

        {/* Supplements section */}
        <Text
          className="mb-3 mt-4 font-inter-medium text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400"
          accessibilityRole="header"
        >
          {t("settings.sections.supplements")}
        </Text>
        <NumericField
          control={control}
          name="evening_supplement"
          label={t("settings.labels.evening")}
          suffix="kr/t"
          placeholder="56"
        />
        <NumericField
          control={control}
          name="night_supplement"
          label={t("settings.labels.night")}
          suffix="kr/t"
          placeholder="75"
        />
        <NumericField
          control={control}
          name="weekend_supplement"
          label={t("settings.labels.weekend")}
          suffix="kr/t"
          placeholder="50"
        />
        <NumericField
          control={control}
          name="holiday_supplement"
          label={t("settings.labels.holiday")}
          suffix="kr/t"
          placeholder="133"
        />

        {/* Overtime section */}
        <Text
          className="mb-3 mt-4 font-inter-medium text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400"
          accessibilityRole="header"
        >
          {t("settings.sections.overtime")}
        </Text>
        <NumericField
          control={control}
          name="overtime_supplement"
          label={t("settings.labels.overtime")}
          suffix="%"
          placeholder="40"
        />

        {/* Pay periods section — collapsed by default */}
        <View className="mt-4">
          <PressableScale
            onPress={() => setShowPayPeriods((v) => !v)}
            accessibilityLabel={t("settings.payPeriods.toggle")}
            accessibilityState={{ expanded: showPayPeriods }}
            className="flex-row items-center justify-between rounded-xl border border-app-border bg-app-surface p-4 dark:border-dark-border dark:bg-dark-surface"
          >
            <Text className="font-inter-medium text-sm text-stone-700 dark:text-stone-300">
              {t("settings.payPeriods.toggle")}
            </Text>
            <Icon
              name={showPayPeriods ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textMuted}
            />
          </PressableScale>
          {showPayPeriods && (
            <View className="mt-2 rounded-xl border border-app-border bg-app-surface p-4 dark:border-dark-border dark:bg-dark-surface">
              <Text className="mb-3 text-xs text-stone-500 dark:text-stone-400">
                {t("settings.payPeriods.hint")}
              </Text>
              <NumericField
                control={control}
                name="regular_period_start_day"
                label={t("settings.payPeriods.regularLabel")}
                placeholder="1"
              />
              <NumericField
                control={control}
                name="extra_period_start_day"
                label={t("settings.payPeriods.extraLabel")}
                placeholder="12"
              />
            </View>
          )}
        </View>

        {/* Stacking policy section */}
        <View
          className="mt-6"
          accessibilityRole="radiogroup"
          accessibilityLabel={t("settings.stackingPolicy.title")}
        >
          <Text
            className="mb-3 font-inter-medium text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400"
            accessibilityRole="header"
          >
            {t("settings.stackingPolicy.title")}
          </Text>
          <Text className="mb-3 text-xs text-stone-500 dark:text-stone-400">
            {t("settings.stackingPolicy.hint")}
          </Text>
          <Controller
            control={control}
            name="stacking_policy"
            render={({ field: { onChange, value } }) => (
              <View>
                {STACKING_POLICIES.map((opt) => (
                  <PressableScale
                    key={opt}
                    onPress={() => onChange(opt)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: value === opt }}
                    className="mb-2 rounded-xl border border-app-border bg-app-surface px-4 py-3 dark:border-dark-border dark:bg-dark-surface"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="flex-1 pr-2 font-inter-medium text-stone-900 dark:text-stone-100">
                        {t(`settings.stackingPolicy.${opt}`)}
                      </Text>
                      {value === opt && <Icon name="checkmark" size={20} color={colors.accent} />}
                    </View>
                    <Text className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      {t(`settings.stackingPolicy.${opt}Hint`)}
                    </Text>
                  </PressableScale>
                ))}
              </View>
            )}
          />
        </View>

        <PressableScale
          onPress={onSubmit}
          disabled={isSubmitting}
          accessibilityLabel={t("settings.save")}
          accessibilityState={{ disabled: isSubmitting }}
          style={isSubmitting ? { opacity: 0.6 } : undefined}
          className="mt-6 rounded-xl bg-accent-dark py-4 dark:bg-accent"
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.bg} accessibilityLabel={t("common.loading")} />
          ) : (
            <Text className="text-center font-inter-semibold text-white dark:text-stone-900">
              {t("settings.save")}
            </Text>
          )}
        </PressableScale>

        {saved && (
          <Text
            className="mt-3 text-center text-emerald-600 dark:text-emerald-400"
            accessibilityLiveRegion="polite"
          >
            {t("settings.saved")}
          </Text>
        )}

        {/* Language picker */}
        <View
          className="mt-8"
          accessibilityRole="radiogroup"
          accessibilityLabel={t("settings.language.title")}
        >
          <Text
            className="mb-3 font-inter-medium text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400"
            accessibilityRole="header"
          >
            {t("settings.language.title")}
          </Text>
          {LOCALE_OPTIONS.map((opt) => (
            <PressableScale
              key={opt.code}
              onPress={() => setLocale(opt.code)}
              accessibilityRole="radio"
              accessibilityState={{ checked: locale === opt.code }}
              className="mb-2 flex-row items-center justify-between rounded-xl border border-app-border bg-app-surface px-4 py-3 dark:border-dark-border dark:bg-dark-surface"
            >
              <Text className="text-stone-900 dark:text-stone-100">{opt.label}</Text>
              {locale === opt.code && <Icon name="checkmark" size={20} color={colors.accent} />}
            </PressableScale>
          ))}
        </View>

        {/* Currency picker */}
        <View
          className="mt-8"
          accessibilityRole="radiogroup"
          accessibilityLabel={t("settings.currency.title")}
        >
          <Text
            className="mb-3 font-inter-medium text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400"
            accessibilityRole="header"
          >
            {t("settings.currency.title")}
          </Text>
          {CURRENCY_OPTIONS.map((opt) => (
            <PressableScale
              key={opt.code}
              onPress={() => setCurrency(opt.code)}
              accessibilityRole="radio"
              accessibilityState={{ checked: currency === opt.code }}
              className="mb-2 flex-row items-center justify-between rounded-xl border border-app-border bg-app-surface px-4 py-3 dark:border-dark-border dark:bg-dark-surface"
            >
              <Text className="text-stone-900 dark:text-stone-100">
                {opt.symbol} {opt.label}
              </Text>
              {currency === opt.code && <Icon name="checkmark" size={20} color={colors.accent} />}
            </PressableScale>
          ))}
        </View>

        {/* Theme picker */}
        <View
          className="mt-8"
          accessibilityRole="radiogroup"
          accessibilityLabel={t("settings.theme.title")}
        >
          <Text
            className="mb-3 font-inter-medium text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400"
            accessibilityRole="header"
          >
            {t("settings.theme.title")}
          </Text>
          {THEME_OPTIONS.map((opt) => (
            <PressableScale
              key={opt.value}
              onPress={() => setPreference(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: preference === opt.value }}
              className="mb-2 flex-row items-center justify-between rounded-xl border border-app-border bg-app-surface px-4 py-3 dark:border-dark-border dark:bg-dark-surface"
            >
              <View className="flex-row items-center gap-3">
                <Icon name={opt.icon} size={20} color={colors.textSecondary} />
                <Text className="text-stone-900 dark:text-stone-100">
                  {t(`settings.theme.${opt.value}`)}
                </Text>
              </View>
              {preference === opt.value && (
                <Icon name="checkmark" size={20} color={colors.accent} />
              )}
            </PressableScale>
          ))}
        </View>

        {/* About section */}
        <View className="mt-8 rounded-xl border border-app-border bg-app-surface p-4 dark:border-dark-border dark:bg-dark-surface">
          <Text
            className="mb-3 font-inter-medium text-xs uppercase tracking-wider text-stone-600 dark:text-stone-400"
            accessibilityRole="header"
          >
            {t("settings.about.title")}
          </Text>
          <Text className="mb-3 text-sm text-stone-600 dark:text-stone-400">
            {t("settings.about.description")}
          </Text>
          <Text className="mb-3 text-sm text-stone-600 dark:text-stone-400">
            {t("settings.about.privacy")}
          </Text>
          <PressableScale
            onPress={() => Linking.openURL("https://github.com/smlhus/shiftpay").catch(() => {})}
            accessibilityRole="link"
            accessibilityLabel="GitHub"
            className="mb-2 flex-row items-center gap-2"
            style={{ minHeight: 48 }}
          >
            <Icon name="logo-github" size={18} color={colors.accent} />
            <Text className="text-sm text-accent-dark dark:text-accent">GitHub</Text>
          </PressableScale>
          <PressableScale
            onPress={() => Linking.openURL("mailto:shiftpay@smlhus.com").catch(() => {})}
            accessibilityRole="link"
            accessibilityLabel="shiftpay@smlhus.com"
            className="mb-3 flex-row items-center gap-2"
            style={{ minHeight: 48 }}
          >
            <Icon name="mail-outline" size={18} color={colors.accent} />
            <Text className="text-sm text-accent-dark dark:text-accent">shiftpay@smlhus.com</Text>
          </PressableScale>
          <Text className="text-xs text-stone-500">
            ShiftPay v{Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Numeric form field bound to react-hook-form. Keeps the toStr/toNum
 * conversion inside the component so the form stores numbers (matching
 * TariffRatesInput) while the TextInput sees strings.
 */
function NumericField({
  control,
  name,
  label,
  suffix,
  placeholder,
}: {
  control: Control<TariffRatesInput>;
  name: NumericFieldName;
  label: string;
  suffix?: string;
  placeholder?: string;
}) {
  const colors = useThemeColors();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, value } }) => (
        <View className="mb-4">
          <Text className="mb-1.5 font-inter-medium text-sm text-stone-700 dark:text-stone-300">
            {label}
          </Text>
          <View className="flex-row items-center">
            <TextInput
              value={toStr(value)}
              onChangeText={(s) => onChange(toNum(s))}
              keyboardType="decimal-pad"
              placeholder={placeholder ?? "0"}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={label + (suffix ? " (" + suffix + ")" : "")}
              className="min-h-[48px] flex-1 rounded-xl border border-app-border bg-app-surface px-4 py-3 text-stone-900 dark:border-dark-border dark:bg-dark-surface dark:text-stone-100"
            />
            {suffix && (
              <Text className="ml-2 text-sm text-stone-500 dark:text-stone-400">{suffix}</Text>
            )}
          </View>
        </View>
      )}
    />
  );
}
