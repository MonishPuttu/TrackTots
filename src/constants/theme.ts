import { StyleSheet, ViewStyle, TextStyle, Platform } from 'react-native';

// Import COLORS directly to avoid circular dependency with constants/index
const COLORS = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#06B6D4',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

// ── Shadows ─────────────────────────────────────────────────────
export const SHADOWS = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 1,
    },
  }) as ViewStyle,
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    android: {
      elevation: 3,
    },
  }) as ViewStyle,
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    android: {
      elevation: 6,
    },
  }) as ViewStyle,
};

// ── Spacing ─────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// ── Border Radii ────────────────────────────────────────────────
export const RADII = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// ── Typography ──────────────────────────────────────────────────
export const TYPOGRAPHY = StyleSheet.create({
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.gray[900],
    letterSpacing: -0.3,
  } as TextStyle,
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.gray[800],
  } as TextStyle,
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray[900],
  } as TextStyle,
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.gray[600],
  } as TextStyle,
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.gray[700],
  } as TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.gray[500],
  } as TextStyle,
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 6,
  } as TextStyle,
});

// ── Shared Component Styles ─────────────────────────────────────
export const SHARED = StyleSheet.create({
  // ── Cards ──────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    ...SHADOWS.sm,
  } as ViewStyle,
  cardElevated: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADII.lg,
    padding: SPACING.lg,
    borderWidth: 0,
    ...SHADOWS.md,
  } as ViewStyle,

  // ── Inputs ─────────────────────
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: 15,
    color: COLORS.gray[800],
  } as TextStyle,
  inputFocused: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  } as ViewStyle,
  inputError: {
    borderColor: COLORS.danger,
    borderWidth: 1.5,
  } as ViewStyle,
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 6,
  } as TextStyle,
  inputHelper: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 4,
  } as TextStyle,
  inputErrorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 4,
  } as TextStyle,

  // ── Buttons ────────────────────
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
  buttonSecondary: {
    backgroundColor: COLORS.gray[100],
    borderRadius: RADII.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  buttonSecondaryText: {
    color: COLORS.gray[700],
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
  buttonDanger: {
    backgroundColor: '#FEE2E2',
    borderRadius: RADII.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as ViewStyle,
  buttonDangerText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
  buttonDisabled: {
    opacity: 0.5,
  } as ViewStyle,

  // ── Empty & Error States ───────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxl,
  } as ViewStyle,
  emptyIcon: {
    marginBottom: SPACING.lg,
    opacity: 0.6,
  } as ViewStyle,
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: SPACING.sm,
    textAlign: 'center',
  } as TextStyle,
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  } as TextStyle,

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxl,
  } as ViewStyle,
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
    textAlign: 'center',
  } as TextStyle,
  errorSubtitle: {
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
  } as TextStyle,
  retryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADII.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as ViewStyle,
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  } as TextStyle,

  // ── Loading ────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
  } as ViewStyle,
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.gray[500],
  } as TextStyle,

  // ── Headers ────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  } as ViewStyle,
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.gray[800],
  } as TextStyle,

  // ── Section ────────────────────
  section: {
    marginBottom: SPACING.xl,
  } as ViewStyle,

  // ── Divider ────────────────────
  divider: {
    height: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: SPACING.lg,
  } as ViewStyle,

  // ── Badge ──────────────────────
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADII.full,
    alignSelf: 'flex-start',
  } as ViewStyle,
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  } as TextStyle,
});
