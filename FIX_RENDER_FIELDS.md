# How to Fix Render Configuration Fields

## If Fields Are Greyed Out or Have `$` Symbol

The `$` is likely just a visual placeholder. Here's how to fix it:

### Method 1: Click and Type Directly

1. **Click directly on the field** (even if it looks greyed out)
2. **Select all text** (Cmd+A on Mac, Ctrl+A on Windows)
3. **Delete everything**
4. **Type the correct value**

### Method 2: Clear and Re-enter

For **Root Directory**:
1. Click in the "Root Directory" field
2. Select all (Cmd+A / Ctrl+A)
3. Delete
4. Type: `alpr/anpr-set-up`
5. Press Enter or click outside

For **Build Command**:
1. Click in the "Build Command" field
2. Select all (Cmd+A / Ctrl+A)
3. Delete
4. Type: `pip install -r requirements.txt`
5. Press Enter or click outside

For **Start Command**:
1. Click in the "Start Command" field
2. Select all (Cmd+A / Ctrl+A)
3. Delete
4. Type: `python app.py`
5. Press Enter or click outside

### Method 3: If Still Not Working

1. **Try refreshing the page** and starting over
2. **Or try clicking "Edit" next to Source Code** and reconfigure
3. **Or create the service first**, then edit it after creation

### Method 4: Create Service First, Then Edit

If the fields are locked during creation:

1. **Create the service with default values** (even if wrong)
2. **After creation, go to Settings**
3. **Edit the fields there** - they should be editable

---

## Alternative: Use Render Blueprint

If manual configuration is problematic, you can use a `render.yaml` file:

1. Create `render.yaml` in your repo root
2. Deploy using the blueprint

But for now, try Method 1 or Method 4 first!

