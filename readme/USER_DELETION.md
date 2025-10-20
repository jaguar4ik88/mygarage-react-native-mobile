# Удаление пользователя и связанных данных

## Каскадное удаление при удалении пользователя

При удалении пользователя из системы автоматически удаляются все связанные с ним данные:

### ✅ Что удаляется автоматически:

1. **Vehicles (Машины)**
   - Foreign key: `user_id` с `onDelete('cascade')`
   - Все машины пользователя удаляются

2. **Reminders (Напоминания)**
   - Foreign key: `user_id` с `onDelete('cascade')`
   - Все напоминания пользователя удаляются

3. **Service Stations (СТО)**
   - Foreign key: `user_id` с `onDelete('cascade')`
   - Все добавленные пользователем СТО удаляются

4. **Expenses History (Траты)**
   - Foreign key: `user_id` с `onDelete('cascade')`
   - Все траты пользователя удаляются

5. **Personal Access Tokens (Токены авторизации)**
   - Все токены Sanctum удаляются через `$user->tokens()->delete()`

### Механизм удаления:

#### 1. На уровне базы данных:
```sql
-- Все таблицы имеют foreign key с onDelete('cascade')
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

#### 2. На уровне модели User (boot method):
```php
protected static function boot()
{
    parent::boot();

    static::deleting(function ($user) {
        $user->vehicles()->delete();
        $user->reminders()->delete();
        $user->serviceStations()->delete();
        $user->expensesHistory()->delete();
        $user->tokens()->delete();
    });
}
```

### Связи в модели User:

```php
public function vehicles(): HasMany
public function reminders(): HasMany
public function serviceStations(): HasMany
public function expensesHistory(): HasMany
```

## Миграции с каскадным удалением:

- ✅ `vehicles` → `user_id` с `onDelete('cascade')`
- ✅ `reminders` → `user_id` с `onDelete('cascade')`
- ✅ `service_stations` → `user_id` с `onDelete('cascade')`
- ✅ `expenses_history` → `user_id` с `onDelete('cascade')`

## Использование:

```php
// Удаление пользователя в админке
$user = User::find($id);
$user->delete(); // Автоматически удалятся все связанные данные
```

## Безопасность:

- Каскадное удаление работает на уровне БД и на уровне модели
- Двойная защита гарантирует полное удаление всех данных
- Транзакции обеспечивают атомарность операции

