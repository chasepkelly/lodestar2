# LodeStar Apollo3 MCP Server

A Model Context Protocol (MCP) server that provides access to the LodeStar Apollo3 API for title insurance calculations, closing costs, and real estate services.

## Features

- **Authentication**: Login to LodeStar API system
- **Closing Cost Calculations**: Calculate title fees, premiums, recording fees, and transfer taxes
- **Property Tax Information**: Get property tax estimates
- **Endorsements**: Retrieve available title policy endorsements
- **Sub Agents**: Get available title companies/agents
- **Geographic Data**: Counties, townships, and geocoding services
- **Questions**: Get county-specific transaction questions
- **Appraisal Modifiers**: Get appraisal fee modifiers

## Installation

1. Clone or download the server files
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the TypeScript code:
   ```bash
   npm run build
   ```

## Configuration

Set up your environment variables. You can either:

1. **Use environment variables:**
   ```bash
   export LODESTAR_CLIENT_NAME="your_client_name"
   export LODESTAR_USERNAME="your_username"
   export LODESTAR_PASSWORD="your_password"
   export LODESTAR_BASE_URL="https://www.lodestarss.com/Live/your_client/"  # Optional
   ```

2. **Use a .env file:**
   ```env
   LODESTAR_CLIENT_NAME=your_client_name
   LODESTAR_USERNAME=your_username
   LODESTAR_PASSWORD=your_password
   LODESTAR_BASE_URL=https://www.lodestarss.com/Live/your_client/
   ```

## Usage

### Running the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

### Connecting to MCP Clients

Add this to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "lodestar": {
      "command": "node",
      "args": ["/path/to/lodestar-apollo3-mcp-server/dist/index.js"],
      "env": {
        "LODESTAR_CLIENT_NAME": "your_client_name",
        "LODESTAR_USERNAME": "your_username",
        "LODESTAR_PASSWORD": "your_password"
      }
    }
  }
}
```

## Available Tools

### Authentication
- `lodestar_login` - Login to LodeStar API
- `lodestar_get_session_status` - Check authentication status

### Core Calculations
- `lodestar_closing_cost_calculations` - Calculate all closing costs, title fees, and taxes
- `lodestar_property_tax` - Get property tax estimates

### Location & Agent Information
- `lodestar_get_counties` - Get available counties for a state
- `lodestar_get_townships` - Get townships for a county
- `lodestar_get_sub_agents` - Get available title companies/agents
- `lodestar_geocode` - Check address location and additional fees

### Transaction Details
- `lodestar_get_endorsements` - Get available title policy endorsements
- `lodestar_get_appraisal_modifiers` - Get appraisal fee modifiers
- `lodestar_get_questions` - Get county-specific transaction questions

## Example Usage

### Basic Workflow - Mortgage Originator (Simplified)

```javascript
// 1. Login first
await lodestar_login({
  username: "demo",
  password: "demo"
})

// 2. Calculate closing costs
await lodestar_closing_cost_calculations({
  state: "NJ",
  county: "Hudson", 
  city: "Hoboken",
  address: "110 Jefferson St. Apt 2",
  purchase_price: 230000,
  loan_amount: 184000,
  purpose: "11", // Purchase
  close_date: "2024-12-01"
})

// 3. Get property tax (if needed)
await lodestar_property_tax({
  state: "NJ",
  county: "Hudson",
  city: "Hoboken", 
  address: "110 Jefferson St. Apt 2",
  purchase_price: 230000,
  close_date: "2024-12-01",
  file_name: "Sample Transaction"
})
```

### Advanced Workflow - Full Control

```javascript
// 1. Login
await lodestar_login()

// 2. Get available sub agents
const agents = await lodestar_get_sub_agents({
  state: "NJ",
  county: "Hudson"
})

// 3. Get available endorsements
const endorsements = await lodestar_get_endorsements({
  state: "NJ", 
  county: "Hudson",
  purpose: "11"
})

// 4. Get transaction questions
const questions = await lodestar_get_questions({
  state: "NJ",
  county: "Hudson",
  city: "Hoboken",
  address: "110 Jefferson St. Apt 2", 
  purchase_price: 230000
})

// 5. Calculate with selected options
await lodestar_closing_cost_calculations({
  state: "NJ",
  county: "Hudson",
  city: "Hoboken", 
  address: "110 Jefferson St. Apt 2",
  purchase_price: 230000,
  sub_agent_id: agents.sub_agents[0].sub_agent_id,
  endorsements: [{
    endo_id: endorsements.endorsements[0].endo_id,
    endo_amount: 25.00
  }],
  include_pdf: true,
  include_breakdown: true
})
```

## API Reference

### Transaction Purpose Codes
- `"00"` - Refinance
- `"04"` - Refinance (Reissue) 
- `"11"` - Purchase

### Property Types (loan_info.prop_type)
- `1` - Single Family
- `2` - Multi Family
- `3` - Condo
- `4` - Coop
- `5` - PUD
- `6` - Manufactured
- `7` - Land

### Loan Types (loan_info.loan_type)
- `1` - Conventional
- `2` - FHA
- `3` - VA
- `4` - USDA

### Property Purpose (loan_info.prop_purpose)
- `1` - Primary Residence
- `2` - Secondary Residence
- `3` - Investment Property

## Error Handling

The server handles common API errors:

- **401 Unauthorized**: Session expired or invalid credentials
- **400 Bad Request**: Missing required parameters
- **Network Errors**: Connection issues with LodeStar API

All errors are returned with descriptive messages to help with debugging.

## Development

### Project Structure
```
src/
  index.ts          # Main server implementation
dist/               # Compiled JavaScript
package.json        # Dependencies and scripts
tsconfig.json       # TypeScript configuration
.env               # Environment variables (not committed)
```

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

## Deployment

### For Public Access

See the deployment instructions provided separately for:
- Railway (recommended)
- Heroku
- Vercel
- AWS Lambda
- Publishing to NPM

### Environment Variables for Production
```env
NODE_ENV=production
LODESTAR_CLIENT_NAME=your_client_name
LODESTAR_USERNAME=your_api_username  
LODESTAR_PASSWORD=your_api_password
LODESTAR_BASE_URL=https://www.lodestarss.com/Live/your_client/
```

## Support

For LodeStar API issues, contact: support@lssoftwaresolutions.com

For MCP server issues, check:
- Environment variables are set correctly
- LodeStar credentials are valid
- Network connectivity to LodeStar API

## License

MIT License - see LICENSE file for details.

## Integration Workflows

The server supports the standard LodeStar integration workflows:

### Mortgage Originator - Simplified
1. `lodestar_login`
2. `lodestar_closing_cost_calculations` 
3. `lodestar_property_tax` (if required)

### Mortgage Originator - Full Control
1. `lodestar_login`
2. `lodestar_get_sub_agents`
3. `lodestar_get_endorsements`
4. `lodestar_get_questions`
5. `lodestar_closing_cost_calculations`
6. `lodestar_property_tax` (if required)

### Title Agent - Simplified
1. `lodestar_login`
2. `lodestar_closing_cost_calculations`
3. `lodestar_property_tax` (if required)

### Title Agent - Full Control
1. `lodestar_login`
2. `lodestar_get_endorsements`
3. `lodestar_get_questions` 
4. `lodestar_closing_cost_calculations`
5. `lodestar_property_tax` (if required)

## Rate Limiting

Be aware that the LodeStar API may have rate limits. The server does not implement client-side rate limiting, so ensure your usage patterns comply with LodeStar's terms of service.

## Security Notes

- Never commit credentials to version control
- Use environment variables for all sensitive configuration
- Consider implementing additional authentication for public deployments
- Monitor API usage to prevent abuse
