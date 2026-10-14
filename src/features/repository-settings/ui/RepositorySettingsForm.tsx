import { Alert, Button, Flex, Form, InputNumber, Select, Typography } from 'antd'
import { useState, type FC } from 'react'

import type {
  Repository,
  RepositoryEngine,
  UpdateRepositoryInput,
} from '../../../entities/repository'
import { buildSettingsPatch, toFormValues, type SettingsFormValues } from '../lib/settingsPatch'
import styles from './RepositorySettingsForm.module.css'

const { Text } = Typography

// deep (SandboxEngine) is phase 3; the api returns only fast until then.
const ENGINE_LABEL: Record<RepositoryEngine, string> = {
  fast: 'DiffEngine (быстрый синтаксический анализ)',
}

export interface RepositorySettingsFormProps {
  repository: Repository
  /** Sends the patch and resolves with the saved repository; rejects when the server refuses. */
  onSave: (patch: UpdateRepositoryInput) => Promise<Repository>
  /** Text of an error the form shows above itself. */
  describeError: (error: unknown) => string
}

/**
 * The form is built once per opened repository: the page mounts it with a `key` and only after
 * the repository has loaded. Later props (a background refetch, the optimistic update of a save
 * and its rollback) never reach the fields. The baseline is what the form opened with, and after
 * a successful save what the server confirmed; only fields that differ from it are sent.
 */
export const RepositorySettingsForm: FC<RepositorySettingsFormProps> = ({
  repository,
  onSave,
  describeError,
}) => {
  const [form] = Form.useForm<SettingsFormValues>()
  const [initialValues] = useState(() => toFormValues(repository))
  const [baseline, setBaseline] = useState(initialValues)
  const [values, setValues] = useState(initialValues)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<{ error: unknown } | null>(null)

  const changed = Object.keys(buildSettingsPatch(baseline, values)).length > 0

  const handleFinish = async (submitted: SettingsFormValues): Promise<void> => {
    const patch = buildSettingsPatch(baseline, submitted)
    if (Object.keys(patch).length === 0) {
      return
    }
    setSaveError(null)
    setSaving(true)
    try {
      const saved = await onSave(patch)
      setBaseline(toFormValues(saved))
    } catch (error) {
      // The entered values stay in the fields; only the message appears.
      setSaveError({ error })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = (): void => {
    form.setFieldsValue(baseline)
    // setFieldsValue does not fire onValuesChange.
    setValues(baseline)
    setSaveError(null)
  }

  return (
    <Form<SettingsFormValues>
      className={styles.form}
      form={form}
      initialValues={initialValues}
      layout="vertical"
      onFinish={(submitted) => void handleFinish(submitted)}
      onValuesChange={(_, all) => {
        setValues(all)
      }}
    >
      {saveError !== null ? (
        <Alert
          className={styles.alert}
          description={describeError(saveError.error)}
          showIcon
          title="Не удалось сохранить настройки"
          type="error"
        />
      ) : null}

      <Form.Item
        extra="SandboxEngine (глубокий анализ в песочнице) появится в фазе 3"
        label="Движок анализа"
      >
        <Text>{ENGINE_LABEL[repository.defaultEngine]}</Text>
      </Form.Item>

      <Form.Item label="Ожидание CI" name="waitForCi" rules={[{ required: true }]}>
        <Select
          options={[
            { value: 'auto', label: 'Авто (ожидать CI при наличии проверок)' },
            { value: 'always', label: 'Всегда (всегда ждать успешного CI)' },
            { value: 'never', label: 'Никогда (запускать ревью без ожидания CI)' },
          ]}
        />
      </Form.Item>

      <Form.Item
        label="Лимит замечаний (1..10)"
        name="maxComments"
        rules={[
          { required: true, message: 'Укажите лимит' },
          { type: 'number', min: 1, max: 10, message: 'Число от 1 до 10' },
        ]}
      >
        <InputNumber className={styles.fullWidth} max={10} min={1} precision={0} />
      </Form.Item>

      <Form.Item label="Публикация вердикта" name="reviewEvent" rules={[{ required: true }]}>
        <Select
          options={[
            { value: 'COMMENT', label: 'Комментарий (при любых замечаниях)' },
            { value: 'REQUEST_CHANGES', label: 'Запрос изменений (при блокирующих)' },
          ]}
        />
      </Form.Item>

      <Flex className={styles.actions} gap={8}>
        <Button disabled={!changed} htmlType="submit" loading={saving} type="primary">
          Сохранить
        </Button>
        <Button disabled={!changed || saving} onClick={handleCancel}>
          Отменить изменения
        </Button>
      </Flex>
    </Form>
  )
}
