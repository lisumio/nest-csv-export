# CsvExportModule documentation

Abstraction around CSV exports for Nest.js using streams

## Usage

### 1. Create TypeORM `SelectQueryBuilder` instance

```typescript
const query = this.usersRepository.createQueryBuilder('user')
```

💡 Because query is `SelectQueryBuilder` from TypeORM you can join tables, filter results, order results and much more (see [TypeORM docs](https://typeorm.io/select-query-builder) for more information)

### 2. Define row type

[TypeORM doesn't transform the result to entity when using streams](https://typeorm.io/select-query-builder#streaming-result-data) so we have to explicitly define the type of the resulting row.

❗ Always make sure that all defined properties actually exist in the result - there is no way for the module nor TypeORM to catch invalid properties on Typescript level so this might cause bugs during runtime

```typescript
type UserExportRow = {
  user_first_name: string
  user_last_name: string
  user_age: number
}
```

🛠 (todo) Add details on how to define row type of streams (prefixes and rules)

🛠 (todo) Type safety

### 3. Define column ids

Column ids are a union type defining each column of the export by a unique id

```typescript
const UserExportId = 'full_name' | 'age'
```

### 4. Create CSV export headings

CSV Export headings object must contain headings of each column

```typescript
const headings: Record<UserExportId, string> = {
  full_name: 'First name',
  age: 'Age',
}
```

💡 Headings definition also determines the column order of the resulting CSV with the top most item being on the left (so the order of columns in our example would be _'First name'_, _'Last name'_ and _'Age'_)

### 5. Create CSV Export resolver

Last missing piece is a resolver that will transform each row to an object containing all ids

```typescript
import { CsvExportResolver } from '@path/csv-export.service'

const resolver: CsvExportResolver<UserMappingKeys, UserExportRow> = (row) => {
  return {
    full_name: `${row.first_name} ${row.last_name}`,
    age: row.user_age,
  }
}
```

### 6. Put everything together

```typescript
const { stream, headers } = this.csvExportService.getProps<
  User,          // First we need to provide the original TypeORM entity
  UserExportRow, // Second we need to provide the query stream result type
  UserExportId,  // Lastly we need to provide the union of export ids
>({
  filename: 'users.csv',
  query,
  mapping,
  resolver,
})

res.set(headers)

stream.pipe(res)

return new Promise((resolve, reject) => {
  stream.on('error', reject)
  stream.on('end', resolve)
})
```

Full code snippet:

```typescript
import { User } from '@path/user.entity'

type UserExportRow = {
  user_first_name: string
  user_last_name: string
  user_age: number
}

const UserExportId = 'full_name' | 'age'

const { stream, headers } = this.csvExportService.getProps<
  User,
  UserExportRow,
  UserExportId,
>({
  filename: 'users.csv',

  query: this.usersRepository.createQueryBuilder('user'),

  mapping: {
    full_name: 'Full name',
    age: 'Age',
  },

  resolver(row) {
    return {
      full_name: `${row.user_first_name} ${row.user_last_name}`,
      age: row.user_age,
    }
  },
})

res.set(headers)

stream.pipe(res)

return new Promise((resolve, reject) => {
  stream.on('error', reject)
  stream.on('end', resolve)
})
```

Alternatively you can use `this.csvExportService.handle` wrapper method to mutate the `res` object and return `Promise` automatically:

```typescript
const props = this.csvExportService.getProps<User, UserExportRow, UserExportId>({
  filename: 'users.csv',
  query,
  mapping,
  strategy,
})

return this.csvExportService.handle(res, props)
```
