import type { playground as en } from '../en/playground'
import type { Translation } from '../types'

export const playground: Translation<typeof en> = {
  title: 'Песочница правил',
  description:
    'Правки правил здесь не сохраняются в репозиторий и не влияют на ревью PR. Симуляция оплачивается из дневного бюджета workspace выбранного репозитория.',
}
