# Regression Prevention Checklist

## 🚨 CRITICAL: Mantine Select Component Requirements

### ✅ **ALWAYS** ensure Mantine Select components use STRING values

**Rule**: Mantine Select `data` prop and `value` prop MUST use strings, never numbers.

#### Common Violations to Check:

1. **Category ID Mapping**:
   ```typescript
   // ❌ WRONG - Will cause "Option value must be a string" error
   const categoryOptions = categories.map(category => ({
     value: category.id, // This could be a number!
     label: category.name
   }));

   // ✅ CORRECT - Always convert to string
   const categoryOptions = categories.map(category => ({
     value: String(category.id), // Always convert to string
     label: category.name
   }));
   ```

2. **Form Initial Values**:
   ```typescript
   // ❌ WRONG
   initialValues: {
     category_id: budget?.category.id || '', // Could be number
   }

   // ✅ CORRECT
   initialValues: {
     category_id: budget?.category.id ? String(budget.category.id) : '',
   }
   ```

3. **Form Updates**:
   ```typescript
   // ❌ WRONG
   form.setValues({
     category_id: budget.category.id, // Could be number
   });

   // ✅ CORRECT
   form.setValues({
     category_id: String(budget.category.id), // Always string
   });
   ```

4. **State Updates**:
   ```typescript
   // ❌ WRONG
   setSelectedCategory(budget.category.id); // Could be number

   // ✅ CORRECT
   setSelectedCategory(String(budget.category.id)); // Always string
   ```

5. **Comparisons**:
   ```typescript
   // ❌ WRONG - Type mismatch if one is string, other is number
   categories.find(cat => cat.id === selectedCategory)

   // ✅ CORRECT - Ensure both sides are same type
   categories.find(cat => String(cat.id) === selectedCategory)
   ```

### Files to Check When Making Changes:

- `frontend/src/components/budgets/BudgetForm.tsx`
- `frontend/src/components/transactions/TransactionForm.tsx`
- `frontend/src/components/transactions/TransactionFilters.tsx`
- Any component using Mantine Select with category/ID data

### Testing Requirements:

Before committing changes to Select components:

1. **Manual Test**: Open the form and verify no console errors
2. **Type Check**: Ensure TypeScript doesn't show type warnings
3. **E2E Test**: Create/edit items using the Select component
4. **Browser Console**: Check for Mantine warnings about data types

## 🔧 Backend API Consistency

### ✅ **ALWAYS** handle both `category` and `category_id` fields properly

**Rule**: Backend serializers should accept `category_id` (string/int) and convert to `category` (object) internally.

#### Key Points:

1. **Serializer Fields**:
   ```python
   # ✅ CORRECT - Support both fields
   category_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
   category = serializers.PrimaryKeyRelatedField(read_only=True)
   ```

2. **Validation Logic**:
   ```python
   # ✅ CORRECT - Only process if explicitly provided
   def validate(self, attrs):
       if 'category_id' in attrs:  # Only if explicitly provided
           category_id = attrs.pop('category_id')
           # ... conversion logic
       return attrs
   ```

3. **Partial Updates**:
   - MUST NOT set category to None if category_id is not provided
   - MUST preserve existing category for partial updates
   - MUST only change category if category_id is explicitly provided

### Testing Requirements:

1. **Unit Tests**: Verify serializer handles category_id correctly
2. **API Tests**: Test both creation and partial updates
3. **Integration Tests**: Test frontend-backend interaction

## 📋 Pre-Commit Checklist

Before committing ANY changes involving Select components or category handling:

- [ ] All Mantine Select `data` arrays use `String(id)` for values
- [ ] All form initialValues convert IDs to strings
- [ ] All form updates convert IDs to strings  
- [ ] All state updates convert IDs to strings
- [ ] All ID comparisons use consistent types
- [ ] Backend serializer handles partial updates correctly
- [ ] Unit tests updated for any serializer changes
- [ ] Manual testing shows no console errors
- [ ] E2E tests pass for affected workflows

## 🚨 Emergency Fix Protocol

If this error appears again:
> "Option value must be a string, other data formats are not supported, got number"

1. **Immediate Fix**: Find the Select component and convert all `value` fields to strings
2. **Root Cause**: Check all places where category IDs are used in that component
3. **Verification**: Test the specific workflow that was broken
4. **Prevention**: Update this checklist if new patterns are found

## 📝 Code Review Guidelines

When reviewing PRs that touch Select components or category handling:

1. **Search for**: `categories.map`, `category.id`, `form.setValues`, `initialValues`
2. **Verify**: All category IDs are converted to strings for Mantine components
3. **Check**: Backend changes maintain API compatibility
4. **Require**: Tests that cover the changed functionality

---

**Remember**: This error has occurred multiple times. Following this checklist religiously will prevent future regressions.
