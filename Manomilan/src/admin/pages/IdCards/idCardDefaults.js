export const FALLBACK_SETTINGS = {
  version: 3,
  cardWidth: 130,
  cardHeight: 70,
  orientation: "landscape",
  bgColor: "#fffaf3",
  borderColor: "#d7ad55",
  fontFamily: "Poppins, Arial, sans-serif",
  fontSize: 11,
  textColor: "#29232a",
  photoWidth: 25,
  photoHeight: 30,
  photoPosition: "left",
  logoPosition: "top-left",
  align: "left",
  padding: 3,
  spacing: 2.5,
  customText: "",
  footerText: "Scan to View Profile",
  customTextPosition: "bottom",
  textStyles: {},
  showBranding: true,
  showCustomText: true,
  showFooter: true,
  showFooterQr: true,
  showFooterHearts: true,
  showName: true,
  showUniqueId: true,
  showPhoto: true,
  showMobile: true,
  showDob: true,
  showAgeGroup: true,
  showGender: true,
  showRegistrationNumber: true,
  showCity: false,
  showCampaign: false,
  fieldPositions: {
    branding: { x: 0, y: 0 },
    photo: { x: 4, y: 30 },
    name: { x: 26, y: 30 },
    uniqueId: { x: 26, y: 43 },
    dob: { x: 62, y: 43 },
    ageGroup: { x: 26, y: 53.5 },
    gender: { x: 62, y: 53.5 },
    registrationNumber: { x: 26, y: 64 },
    mobile: { x: 62, y: 64 },
    city: { x: 26, y: 74.5 },
    campaign: { x: 62, y: 74.5 },
    customText: { x: 36, y: 91 },
    footer: { x: 0, y: 86 },
  },
  ageGroups: [
    { code: "01", label: "18-25", min: 18, max: 25 },
    { code: "02", label: "26-30", min: 26, max: 30 },
    { code: "03", label: "31-35", min: 31, max: 35 },
    { code: "04", label: "36-40", min: 36, max: 40 },
    { code: "05", label: "41-50", min: 41, max: 50 },
    { code: "06", label: "51-120", min: 51, max: 120 },
  ],
};

const LEGACY_FIELD_POSITIONS = {
  branding: { x: 3, y: 2 },
  photo: { x: 2, y: 25 },
  name: { x: 31, y: 20 },
  uniqueId: { x: 31, y: 36 },
  mobile: { x: 31, y: 54 },
  dob: { x: 66, y: 54 },
  ageGroup: { x: 31, y: 70 },
  gender: { x: 66, y: 70 },
  registrationNumber: { x: 31, y: 84 },
  city: { x: 2, y: 84 },
  campaign: { x: 66, y: 84 },
  customText: { x: 2, y: 93 },
};

const clamp = (value) => Math.min(100, Math.max(0, value));

export function normalizeIdCardSettings(savedSettings = {}) {
  const elementSizes = savedSettings.elementSizes
    && typeof savedSettings.elementSizes === "object"
    && !Array.isArray(savedSettings.elementSizes)
    ? savedSettings.elementSizes
    : {};
  const textStyles = savedSettings.textStyles
    && typeof savedSettings.textStyles === "object"
    && !Array.isArray(savedSettings.textStyles)
    ? savedSettings.textStyles
    : {};
  const settings = { ...FALLBACK_SETTINGS, ...savedSettings, elementSizes, textStyles };

  if (Number(savedSettings.version || 0) < FALLBACK_SETTINGS.version) {
    const fieldPositions = Object.fromEntries(
      Object.entries(FALLBACK_SETTINGS.fieldPositions).map(([key, fallback]) => {
        const previous = LEGACY_FIELD_POSITIONS[key];
        const saved = savedSettings.fieldPositions?.[key];
        if (!previous || !saved) return [key, { ...fallback }];

        const migrate = (axis) => {
          const value = Number(saved[axis]);
          const oldDefault = previous[axis];
          return Number.isFinite(value) ? clamp(fallback[axis] + value - oldDefault) : fallback[axis];
        };

        return [
          key,
          {
            x: key === "branding" ? fallback.x : migrate("x"),
            y: migrate("y"),
          },
        ];
      }),
    );

    return {
      ...settings,
      version: FALLBACK_SETTINGS.version,
      cardWidth: FALLBACK_SETTINGS.cardWidth,
      cardHeight: FALLBACK_SETTINGS.cardHeight,
      orientation: FALLBACK_SETTINGS.orientation,
      bgColor: FALLBACK_SETTINGS.bgColor,
      borderColor: FALLBACK_SETTINGS.borderColor,
      textColor: FALLBACK_SETTINGS.textColor,
      padding: FALLBACK_SETTINGS.padding,
      fieldPositions,
    };
  }

  return {
    ...settings,
    fieldPositions: Object.fromEntries(
      Object.entries(FALLBACK_SETTINGS.fieldPositions).map(([key, fallback]) => [
        key,
        { ...fallback, ...(savedSettings.fieldPositions?.[key] || {}) },
      ]),
    ),
  };
}
