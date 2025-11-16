# PermitPro - GitHub Pages Deployment Instructions

## Quick Deploy to GitHub Pages

### Option 1: Quick Setup (Recommended)
1. Create a new repository on GitHub (e.g., `permitpro-demo`)
2. Upload the `index.html` file to the repository
3. Go to Settings → Pages
4. Under "Source", select "Deploy from a branch"
5. Select "main" branch and "/ (root)" folder
6. Click Save
7. Your site will be live at: `https://yourusername.github.io/permitpro-demo`

### Option 2: Using Git Command Line
```bash
# Create a new repository on GitHub first, then:
git clone https://github.com/yourusername/permitpro-demo.git
cd permitpro-demo

# Copy your index.html file into this directory
cp /path/to/index.html .

# Commit and push
git add index.html
git commit -m "Initial commit: PermitPro demo"
git push origin main

# Enable GitHub Pages in repository Settings → Pages
```

## What's Included

The `index.html` file is a **completely self-contained** demo that includes:

- ✅ Full React application (using CDN)
- ✅ Tailwind CSS styling (using CDN)
- ✅ All icons as inline SVG components
- ✅ Dark mode toggle
- ✅ Interactive demo with 4 project types
- ✅ Fake data for demonstration purposes
- ✅ No build process required
- ✅ No dependencies to install

## Features

- **Demo Projects**: Deck, Bathroom, Fence, and Solar Panel installations
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Interactive**: Click through the permit discovery flow
- **Building Codes**: View relevant code sections for each project type
- **Form Previews**: See locked form previews (upgrade CTA)

## Customization

To customize the demo:

1. Open `index.html` in any text editor
2. Look for the `demoProjects` array to modify project types
3. Edit the `demoResults` object to change permit details
4. Modify the `getRelatedCodes` function to update building code references

## Browser Support

Works in all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## No Backend Required

This is a static demo that runs entirely in the browser. No server, database, or API keys needed!

## Next Steps

Once deployed, share your demo URL with:
- Potential users
- Investors
- Contractors
- Municipal officials

---

**Note**: This is a demonstration version with fictional data. The full PermitPro application would require:
- Backend API
- Real jurisdiction data
- Authentication system
- Payment processing
- Document storage
- Municipal API integrations
