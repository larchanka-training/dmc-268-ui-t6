import { Alert, Button, Flex, Form, Input, InputNumber, Radio, Select, Typography } from 'antd'
import { useImperativeHandle, useState, type FC, type ReactNode, type Ref } from 'react'

import type {
  Repository,
  RepositoryEngine,
  UpdateRepositoryInput,
} from '../../../entities/repository'
import { useTranslation } from '../../../shared/i18n'
import {
  splitServerError,
  type ServerFieldErrors,
  type SettingsFieldName,
} from '../lib/serverFieldErrors'
import { SEVERITY_THRESHOLD_OPTIONS } from '../lib/severityThreshold'
import {
  applySavedValues,
  buildSettingsPatch,
  hasDraftChanges,
  toFormValues,
  validateBranchFilterText,
  type SettingsFormValues,
} from '../lib/settingsPatch'
import styles from './RepositorySettingsForm.module.css'

const { Text } = Typography

// The first editable field: where focus goes when a button the user used turns disabled.
const FIRST_FIELD: SettingsFieldName = 'waitForCi'

/** Props that put the server's complaint under a field, or none when it had no complaint. */
function serverErrorProps(
  errors: ServerFieldErrors,
  name: SettingsFieldName,
): { validateStatus?: 'error'; help?: ReactNode } {
  const messages = errors[name]
  if (messages === undefined) {
    return {}
  }
  return {
    validateStatus: 'error',
    help: messages.map((message) => <div key={message}>{message}</div>),
  }
}

/** What the page that mounts the form can ask of it. */
export interface RepositorySettingsFormHandle {
  /** Moves the focus to the first editable field. */
  focusFirstField: () => void
  /**
   * `true` while a field holds anything other than what the form opened with, or last saved,
   * as typed: an emptied limit counts though "Save" stays disabled for it.
   */
  hasUnsavedChanges: () => boolean
  /**
   * Whether `repository` holds other values than the baseline, compared field by field as the
   * form holds them (see `hasUnsavedChanges`).
   */
  differsFromBaseline: (repository: Repository) => boolean
  /**
   * Makes the values of `repository` the baseline and puts them into every field, dropping what
   * was typed and every error shown. The fields are not remounted, so a focused field keeps the
   * focus; nothing here moves it.
   */
  resetTo: (repository: Repository) => void
}

export interface RepositorySettingsFormProps {
  repository: Repository
  /** Sends the patch and resolves with the saved repository; rejects when the server refuses. */
  onSave: (patch: UpdateRepositoryInput) => Promise<Repository>
  /** Text of an error the form shows above itself. */
  describeError: (error: unknown) => string
  /**
   * When given, "Cancel changes" calls it instead of restoring the baseline: the page has
   * other values to load (`resetTo`) and closes what told the user about them.
   */
  onCancel?: () => void
  ref?: Ref<RepositorySettingsFormHandle>
}

/**
 * The form is built once per opened repository: the page mounts it with a `key` and only after
 * the repository has loaded. Later props (a background refetch, the optimistic update of a save
 * and its rollback) never reach the fields; when the page wants fresh values in, it asks through
 * `ref` (`hasUnsavedChanges`, `differsFromBaseline`) what that would lose, and hands them over
 * with `resetTo`. The baseline is what the form opened with, and after a successful save what the
 * server confirmed; only fields that differ from it are sent.
 */
export const RepositorySettingsForm: FC<RepositorySettingsFormProps> = ({
  repository,
  onSave,
  describeError,
  onCancel,
  ref,
}) => {
  const { t } = useTranslation()
  // deep (SandboxEngine) is phase 3; the api returns only fast until then.
  const engineLabel: Record<RepositoryEngine, string> = { fast: t('settings.form.engineFast') }
  const [form] = Form.useForm<SettingsFormValues>()
  const [initialValues] = useState(() => toFormValues(repository))
  const [baseline, setBaseline] = useState(initialValues)
  const [values, setValues] = useState(initialValues)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<{ error: unknown } | null>(null)
  const [serverErrors, setServerErrors] = useState<ServerFieldErrors>({})

  const changed = Object.keys(buildSettingsPatch(baseline, values)).length > 0

  useImperativeHandle(
    ref,
    () => ({
      focusFirstField: () => {
        form.focusField(FIRST_FIELD)
      },
      // Anything typed counts, even what no PATCH could carry (an emptied limit): asked of the
      // store now, not of the `values` of the last render.
      hasUnsavedChanges: () => hasDraftChanges(baseline, form.getFieldsValue()),
      differsFromBaseline: (other) => hasDraftChanges(baseline, toFormValues(other)),
      resetTo: (other) => {
        const next = toFormValues(other)
        // `setFields` also drops the validation messages, and unlike `resetFields` it does not
        // remount the fields (the focus stays) nor go back to the values the form opened with.
        form.setFields(
          (Object.keys(next) as SettingsFieldName[]).map((name) => ({
            name,
            value: next[name],
            errors: [],
          })),
        )
        // setFields does not fire onValuesChange.
        setBaseline(next)
        setValues(next)
        setSaveError(null)
        setServerErrors({})
      },
    }),
    [form, baseline],
  )

  const handleFinish = async (submitted: SettingsFormValues): Promise<void> => {
    const patch = buildSettingsPatch(baseline, submitted)
    if (Object.keys(patch).length === 0) {
      return
    }
    setSaveError(null)
    setServerErrors({})
    setSaving(true)
    try {
      const saved = await onSave(patch)
      // What the user has not touched since the submit shows what the server confirmed (a field
      // that showed an old value takes the fresh one); a field they changed while the request ran
      // keeps what they typed, and is a change against the new baseline.
      const next = applySavedValues(submitted, form.getFieldsValue(), toFormValues(saved))
      form.setFieldsValue(next)
      // setFieldsValue does not fire onValuesChange.
      setValues(next)
      setBaseline(toFormValues(saved))
      // "Save" is disabled again now: keep the keyboard user in the form.
      form.focusField(FIRST_FIELD)
    } catch (error) {
      // The entered values stay in the fields; only messages appear: under the fields the
      // server named, above the form for the rest.
      const split = splitServerError(error)
      setServerErrors(split.fields)
      setSaveError(split.general ? { error } : null)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = (): void => {
    if (onCancel !== undefined) {
      onCancel()
      return
    }
    form.setFieldsValue(baseline)
    // setFieldsValue does not fire onValuesChange.
    setValues(baseline)
    setSaveError(null)
    setServerErrors({})
    // The button just used is disabled now: keep the keyboard user in the form.
    form.focusField(FIRST_FIELD)
  }

  return (
    <Form<SettingsFormValues>
      className={styles.form}
      form={form}
      initialValues={initialValues}
      layout="vertical"
      onFinish={(submitted) => void handleFinish(submitted)}
      onValuesChange={(changedValues, all) => {
        setValues(all)
        // What the user edits is no longer what the server refused.
        setServerErrors((previous) =>
          Object.keys(changedValues).some((name) => name in previous)
            ? Object.fromEntries(
                Object.entries(previous).filter(([name]) => !(name in changedValues)),
              )
            : previous,
        )
      }}
    >
      {saveError !== null ? (
        <Alert
          className={styles.alert}
          description={describeError(saveError.error)}
          showIcon
          title={t('settings.saveFailed')}
          type="error"
        />
      ) : null}

      <Form.Item extra={t('settings.form.engineExtra')} label={t('settings.form.engine')}>
        <Text>{engineLabel[repository.defaultEngine]}</Text>
      </Form.Item>

      <Form.Item
        label={t('settings.form.waitForCi')}
        name="waitForCi"
        rules={[{ required: true }]}
        {...serverErrorProps(serverErrors, 'waitForCi')}
      >
        <Select
          options={[
            { value: 'auto', label: t('settings.form.waitForCiAuto') },
            { value: 'always', label: t('settings.form.waitForCiAlways') },
            { value: 'never', label: t('settings.form.waitForCiNever') },
          ]}
        />
      </Form.Item>

      <Form.Item
        label={t('settings.form.maxComments')}
        name="maxComments"
        rules={[
          { required: true, message: t('settings.form.maxCommentsRequired') },
          { type: 'number', min: 1, max: 10, message: t('settings.form.maxCommentsRange') },
        ]}
        {...serverErrorProps(serverErrors, 'maxComments')}
      >
        <InputNumber className={styles.fullWidth} max={10} min={1} precision={0} />
      </Form.Item>

      <Form.Item
        label={t('settings.form.reviewEvent')}
        name="reviewEvent"
        rules={[{ required: true }]}
        {...serverErrorProps(serverErrors, 'reviewEvent')}
      >
        <Select
          options={[
            { value: 'COMMENT', label: t('settings.form.reviewEventComment') },
            { value: 'REQUEST_CHANGES', label: t('settings.form.reviewEventRequestChanges') },
          ]}
        />
      </Form.Item>

      <Form.Item
        extra={t('settings.form.branchFilterExtra')}
        label={t('settings.form.branchFilter')}
        name="branchFilter"
        rules={[
          {
            validator: (_, value: string | undefined) => {
              const message = validateBranchFilterText(value ?? '')
              return message === null ? Promise.resolve() : Promise.reject(new Error(message))
            },
          },
        ]}
        {...serverErrorProps(serverErrors, 'branchFilter')}
      >
        <Input.TextArea rows={4} spellCheck={false} />
      </Form.Item>

      <Form.Item
        extra={t('settings.form.severityThresholdExtra')}
        label={t('settings.form.severityThreshold')}
        name="severityThreshold"
        {...serverErrorProps(serverErrors, 'severityThreshold')}
      >
        <Radio.Group aria-label={t('settings.form.severityThreshold')} orientation="vertical">
          {SEVERITY_THRESHOLD_OPTIONS.map((option) => (
            <Radio key={option.value} value={option.value}>
              {option.label} <Text type="secondary">{`— ${option.levels.join(', ')}`}</Text>
            </Radio>
          ))}
        </Radio.Group>
      </Form.Item>

      <Flex className={styles.actions} gap={8}>
        <Button disabled={!changed} htmlType="submit" loading={saving} type="primary">
          {t('settings.form.save')}
        </Button>
        <Button disabled={!hasDraftChanges(baseline, values) || saving} onClick={handleCancel}>
          {t('settings.form.cancelChanges')}
        </Button>
      </Flex>
    </Form>
  )
}
