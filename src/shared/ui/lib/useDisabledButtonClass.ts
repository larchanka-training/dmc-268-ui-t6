import { useContext } from 'react'
import { ConfigProvider } from 'antd'

/** The antd class that gives a Button the disabled look without native `disabled`, for a button that must keep the focus (pair it with `aria-disabled`); guarded by `styles/antd.button.test.tsx`. */
export function useDisabledButtonClass(): string {
  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext)
  return `${getPrefixCls('btn')}-disabled`
}
