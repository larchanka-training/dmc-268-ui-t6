import { theme as antdTheme, type MappingAlgorithm, type ThemeConfig } from 'antd'

import { RV_FONT_MONO, RV_FONT_SANS, RV_PALETTE, type RvThemeMode } from './palette'

export interface BuildThemeOptions {
  /** Turns every Ant Design animation off, for the "reduce motion" system setting. */
  reducedMotion?: boolean
}

/**
 * Ant Design treats `colorPrimary`, `colorSuccess` and the other seeds as input of its algorithm:
 * the dark one darkens them and both derive backgrounds and borders on their own. This second
 * algorithm runs after the stock one and pins the results to the palette, so every component,
 * including ones the app does not use yet, gets exactly our colours.
 */
function pinPalette(mode: RvThemeMode): MappingAlgorithm {
  const p = RV_PALETTE[mode]
  return (_seed, map) => {
    if (map === undefined) {
      throw new Error('pinPalette must run after a base algorithm')
    }
    return {
      ...map,
      colorPrimary: p.accent,
      colorPrimaryHover: p.accentHover,
      colorPrimaryActive: p.accentActive,
      // The focus ring of Ant Design is drawn with this token.
      colorPrimaryBorder: p.link,
      colorPrimaryBg: p.infoBg,
      colorPrimaryBgHover: p.infoBgStrong,
      colorLink: p.link,
      colorLinkHover: p.link,
      colorLinkActive: p.link,
      colorInfo: p.link,
      colorInfoBg: p.infoBg,
      colorInfoBgHover: p.infoBgStrong,
      colorInfoBorder: p.infoBorder,
      colorSuccess: p.success,
      colorSuccessBg: p.successBg,
      colorSuccessBgHover: p.successBgStrong,
      colorSuccessBorder: p.successBorder,
      colorWarning: p.warning,
      colorWarningBg: p.warningBg,
      colorWarningBgHover: p.warningBgStrong,
      colorWarningBorder: p.warningBorder,
      colorError: p.danger,
      colorErrorHover: p.dangerHover,
      colorErrorActive: p.dangerActive,
      colorErrorBorderHover: p.dangerHover,
      colorErrorBg: p.dangerBg,
      colorErrorBgHover: p.dangerBgStrong,
      colorErrorBgFilledHover: p.dangerBgStrong,
      colorErrorBgActive: p.dangerBorder,
      colorErrorBorder: p.dangerBorder,
      // Coloured text (`Typography type="success"`, the icon of an `Alert`) is the status colour
      // itself, not a darker step of it.
      colorPrimaryText: p.link,
      colorPrimaryTextHover: p.link,
      colorPrimaryTextActive: p.link,
      colorInfoText: p.link,
      colorSuccessText: p.success,
      colorSuccessTextHover: p.success,
      colorSuccessTextActive: p.success,
      colorWarningText: p.warning,
      colorWarningTextHover: p.warning,
      colorWarningTextActive: p.warning,
      colorErrorText: p.danger,
      colorErrorTextHover: p.danger,
      colorErrorTextActive: p.danger,
      colorBgMask: p.mask,
      // The border of a disabled Button, Input, InputNumber or Select. Ant Design lightens the
      // page background for it, and our dark page background is a deep blue, so it came out blue
      // (#1f3b87); a disabled control keeps the neutral border of a field.
      colorBorderDisabled: p.borderStrong,
    }
  }
}

/**
 * Flat Console as an Ant Design theme. Everything a token can reach is set here, so a component
 * that the app has not used yet still arrives in the right colours, sizes and font. What tokens
 * cannot express lives in `styles/antd.css`. Rules and numbers: `docs/DESIGN_SYSTEM.md`.
 */
export function buildTheme(mode: RvThemeMode, options: BuildThemeOptions = {}): ThemeConfig {
  const p = RV_PALETTE[mode]
  return {
    algorithm: [
      mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      pinPalette(mode),
    ],
    token: {
      motion: options.reducedMotion !== true,
      boxShadowSecondary: p.popoverShadow,
      colorPrimary: p.accent,
      colorPrimaryHover: p.accentHover,
      colorPrimaryActive: p.accentActive,
      colorLink: p.link,
      colorLinkHover: p.link,
      colorLinkActive: p.link,
      colorInfo: p.link,
      colorSuccess: p.success,
      colorWarning: p.warning,
      colorError: p.danger,
      colorBgBase: p.bg,
      colorBgLayout: p.bg,
      colorBgContainer: p.bgRaised,
      colorBgElevated: p.popover,
      colorBorder: p.borderStrong,
      colorBorderSecondary: p.border,
      colorSplit: p.border,
      colorText: p.text,
      colorTextSecondary: p.text2,
      colorTextTertiary: p.text3,
      colorTextDescription: p.text2,
      colorTextPlaceholder: p.text3,
      colorTextHeading: p.text,
      colorBgTextHover: p.hover,
      colorBgTextActive: p.selected,
      fontFamily: RV_FONT_SANS,
      fontFamilyCode: RV_FONT_MONO,
      fontSize: 13,
      borderRadius: 6,
      borderRadiusSM: 4,
      borderRadiusLG: 8,
      controlHeight: 32,
      controlHeightSM: 26,
      controlHeightLG: 40,
      lineWidthFocus: 2,
      // A focused field in the error or warning state keeps its red or yellow border, so the
      // halo is what shows the focus: it takes the focus colour instead of a faint tint.
      colorErrorOutline: p.link,
      colorWarningOutline: p.link,
      wireframe: false,
    },
    components: {
      Button: {
        fontWeight: 500,
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
        colorPrimary: p.accent,
        colorPrimaryHover: p.accentHover,
        colorPrimaryActive: p.accentActive,
        // Text of a filled danger button: dark on the light red of the dark theme.
        dangerColor: p.dangerFg,
        defaultBg: p.surface,
        defaultBorderColor: p.border,
        // Hover and press stay neutral: by default Ant Design recolours the text and the border
        // of a secondary button to the primary colour. A press goes one colour step further
        // than hover: the click ripple is off, so the colour is the only press feedback.
        defaultHoverBg: p.buttonHover,
        defaultHoverColor: p.text,
        defaultHoverBorderColor: p.borderStrong,
        defaultActiveBg: p.buttonActive,
        defaultActiveColor: p.text,
        defaultActiveBorderColor: p.borderStrong,
        textTextColor: p.text2,
        textTextHoverColor: p.text,
        textTextActiveColor: p.text,
        textHoverBg: p.hover,
        paddingInline: 12,
        paddingInlineLG: 18,
        paddingInlineSM: 8,
        contentFontSize: 12.5,
        contentFontSizeSM: 12,
        contentFontSizeLG: 13,
        // A large button keeps the control radius of 6px instead of the card radius.
        borderRadiusLG: 6,
      },
      Layout: {
        siderBg: p.sidebar,
        bodyBg: p.bg,
        headerBg: p.bg,
        triggerBg: p.sidebar,
        triggerColor: p.text2,
      },
      Menu: {
        itemBg: 'transparent',
        itemColor: p.text2,
        itemHoverColor: p.text,
        itemHoverBg: p.hover,
        itemSelectedBg: p.selected,
        itemSelectedColor: p.text,
        itemHeight: 30,
        itemBorderRadius: 6,
        itemMarginInline: 0,
        itemMarginBlock: 2,
        iconSize: 16,
        collapsedIconSize: 16,
        iconMarginInlineEnd: 9,
        activeBarBorderWidth: 0,
        fontSize: 13,
      },
      Table: {
        headerBg: 'transparent',
        headerColor: p.text2,
        headerSplitColor: 'transparent',
        borderColor: p.border,
        rowHoverBg: p.hover,
        // A selected row is neutral, like every selected state.
        rowSelectedBg: p.selected,
        rowSelectedHoverBg: p.selected,
        cellPaddingBlock: 9,
        cellPaddingInline: 12,
        cellFontSize: 12.5,
        colorBgContainer: 'transparent',
      },
      Input: {
        colorBgContainer: p.bg,
        hoverBg: p.bg,
        activeBg: p.bg,
        hoverBorderColor: p.text3,
        activeBorderColor: p.link,
        activeShadow: `0 0 0 3px ${p.focusRing}`,
        inputFontSize: 12.5,
        // The clear icon has 3:1 against the field at rest and brightens on hover (WCAG 1.4.11).
        // Its 2px focus ring is a rule of `styles/antd.css`: `lineWidthFocus` here empties the
        // CSS variable of the library's rule instead.
        colorTextQuaternary: p.text3,
        colorIcon: p.text2,
      },
      InputNumber: {
        colorBgContainer: p.bg,
        // Text of a control, as on Input (§4); Ant Design derives the padding from it, so the
        // field stays 32px.
        inputFontSize: 12.5,
        hoverBg: p.bg,
        activeBg: p.bg,
        hoverBorderColor: p.text3,
        activeBorderColor: p.link,
        activeShadow: `0 0 0 3px ${p.focusRing}`,
      },
      Select: {
        colorBgContainer: p.bg,
        hoverBorderColor: p.text3,
        activeBorderColor: p.link,
        activeOutlineColor: p.focusRing,
        // The focus halo is 3px, as on Input (§7).
        controlOutlineWidth: 3,
        optionSelectedBg: p.selected,
        // The option under the keyboard is hovered; a selected one stays selected, never blue.
        optionActiveBg: p.hover,
        controlItemBgActiveHover: p.selected,
        optionFontSize: 12.5,
        // Value and chip text of a control, as on Input (§4); the line height keeps the 21px line,
        // so a single Select stays 32px and a chip 24px.
        fontSize: 12.5,
        lineHeight: 21 / 12.5,
        // A multiple Select's chip lies on the selected surface, not on Ant Design's grey fill.
        multipleItemBg: p.surface3,
        // The clear icon and the arrow have 3:1 against the field (WCAG 1.4.11); the clear icon
        // brightens on hover to the secondary text colour, the rest colour of a chip's remove icon.
        colorTextQuaternary: p.text3,
        colorIcon: p.text2,
      },
      Segmented: {
        trackBg: p.bg,
        trackPadding: 3,
        itemColor: p.text2,
        itemHoverColor: p.text,
        itemSelectedBg: p.surface3,
        itemSelectedColor: p.text,
      },
      Modal: {
        contentBg: p.popover,
        headerBg: p.popover,
        footerBg: p.popover,
        titleFontSize: 15,
        borderRadiusLG: 10,
        boxShadow: p.popoverShadow,
      },
      Tooltip: { colorBgSpotlight: p.text, colorTextLightSolid: p.bg },
      Descriptions: { labelColor: p.text2, itemPaddingBottom: 10 },
      Tree: {
        nodeSelectedBg: p.selected,
        nodeHoverBg: p.hover,
        titleHeight: 28,
        colorBgContainer: 'transparent',
      },
      Collapse: { headerBg: p.surface, contentBg: 'transparent' },
      Breadcrumb: { linkColor: p.text2, lastItemColor: p.text, separatorColor: p.text3 },
      Switch: { colorPrimary: p.accent, colorPrimaryHover: p.accentHover },
      // An avatar without a picture is a neutral circle with the text colour.
      Avatar: { colorTextPlaceholder: p.surface3, colorTextLightSolid: p.text },
      Card: { colorBgContainer: p.bgRaised, bodyPadding: 16 },
      Alert: { withDescriptionPadding: '12px 14px', withDescriptionIconSize: 18 },
      Checkbox: { colorPrimary: p.accent, colorPrimaryHover: p.accentHover },
      Radio: { colorPrimary: p.accent, colorPrimaryHover: p.accentHover },
      // Stages take the tones of the status tags: the stage in progress is in the link colour of
      // the info tone, never in the accent of the primary action. A finished stage turns green
      // and a waiting one gets its grey border in `styles/antd.css`: no token reaches them.
      Steps: {
        colorPrimary: p.link,
        colorPrimaryHover: p.link,
        // The number or the cross on the filled circle of the current stage: dark on the light
        // link and danger fills of the dark theme, white on the darker ones of the light theme.
        colorTextLightSolid: p.bg,
        // A custom icon in a waiting stage that the screen does not colour stays readable.
        colorTextDisabled: p.text3,
        // A waiting stage is an outlined circle, not a filled one.
        colorFillTertiary: 'transparent',
        // As large as the small circle (`fontSizeHeading3`, 22px): by default a custom icon,
        // such as a stop sign, is 26px and sticks out of the row of numbered circles.
        customIconFontSize: 22,
      },
    },
  }
}
