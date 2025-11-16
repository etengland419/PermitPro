# ============================================
# PERMIT DISCOVERY ENGINE
# ============================================

class PermitDiscoveryEngine:
    """
    Core engine for discovering required permits based on project details
    """
    
    def __init__(self, llm_client, database, geocoder):
        self.llm = llm_client
        self.db = database
        self.geocoder = geocoder
        self.vector_store = VectorDatabase()
    
    async def discover_permits(self, project_data):
        """
        Main entry point for permit discovery
        
        Args:
            project_data: {
                'description': str,
                'address': str,
                'project_type': str,
                'details': dict
            }
        
        Returns:
            List of required permits with details
        """
        
        # Step 1: Resolve jurisdiction
        jurisdiction = await self.resolve_jurisdiction(project_data['address'])
        
        # Step 2: Classify project and extract key features
        classification = await self.classify_project(project_data)
        
        # Step 3: Query permit rules for jurisdiction
        permit_rules = await self.get_jurisdiction_rules(jurisdiction)
        
        # Step 4: Match project to required permits
        required_permits = await self.match_permits(classification, permit_rules)
        
        # Step 5: Fetch current forms
        permit_forms = await self.fetch_forms(required_permits, jurisdiction)
        
        # Step 6: Generate workflow
        workflow = await self.generate_workflow(required_permits, jurisdiction)
        
        return {
            'jurisdiction': jurisdiction,
            'permits': required_permits,
            'forms': permit_forms,
            'workflow': workflow,
            'estimated_timeline': self.calculate_timeline(required_permits),
            'estimated_cost': self.calculate_costs(required_permits, project_data)
        }
    
    async def resolve_jurisdiction(self, address):
        """
        Determine governing jurisdiction from address
        """
        # Geocode address
        geocode_result = await self.geocoder.geocode(address)
        
        if not geocode_result.success:
            raise AddressValidationError("Cannot validate address")
        
        # Extract jurisdiction hierarchy
        jurisdiction = {
            'address': geocode_result.formatted_address,
            'coordinates': geocode_result.coordinates,
            'city': geocode_result.city,
            'county': geocode_result.county,
            'state': geocode_result.state,
            'zip': geocode_result.postal_code
        }
        
        # Check which level handles permits (city vs county)
        permit_authority = await self.db.query(
            "SELECT authority_level, authority_name, contact_info "
            "FROM jurisdictions "
            "WHERE ST_Contains(boundary, ST_Point($1, $2))",
            geocode_result.coordinates.lng,
            geocode_result.coordinates.lat
        )
        
        jurisdiction['permit_authority'] = permit_authority
        
        return jurisdiction
    
    async def classify_project(self, project_data):
        """
        Use LLM to classify project and extract structured information
        """
        
        prompt = f"""
        Analyze this construction/renovation project and extract key details:
        
        Description: {project_data['description']}
        Project Type: {project_data.get('project_type', 'unknown')}
        Additional Details: {project_data.get('details', {})}
        
        Extract and return JSON with:
        {{
            "project_category": "residential|commercial|industrial",
            "work_types": ["structural", "electrical", "plumbing", "mechanical", "cosmetic"],
            "scope": "new_construction|addition|alteration|repair",
            "square_footage": number or null,
            "stories": number or null,
            "involves_utilities": bool,
            "involves_structural_changes": bool,
            "involves_occupancy_change": bool,
            "fire_safety_concerns": bool,
            "key_features": [list of important features],
            "risk_level": "low|medium|high"
        }}
        """
        
        response = await self.llm.generate(
            prompt=prompt,
            response_format='json'
        )
        
        classification = parse_json(response)
        
        # Enhance with rule-based checks
        classification['estimated_value'] = self.estimate_project_value(
            classification, 
            project_data
        )
        
        return classification
    
    async def get_jurisdiction_rules(self, jurisdiction):
        """
        Retrieve permit requirements for this jurisdiction
        """
        
        # Query database for jurisdiction rules
        rules = await self.db.query(
            "SELECT * FROM permit_requirements "
            "WHERE jurisdiction_id = $1 AND active = true",
            jurisdiction['permit_authority']['id']
        )
        
        # If no cached rules, scrape from municipality website
        if not rules:
            rules = await self.scrape_jurisdiction_rules(jurisdiction)
        
        # Also query vector database for regulatory text
        regulatory_context = await self.vector_store.search(
            query=f"{jurisdiction['city']} building code permit requirements",
            top_k=10
        )
        
        return {
            'structured_rules': rules,
            'regulatory_context': regulatory_context
        }
    
    async def match_permits(self, classification, permit_rules):
        """
        Match project classification to required permits using hybrid approach
        """
        
        required_permits = []
        
        # Rule-based matching
        rule_based_permits = self.apply_rule_based_matching(
            classification, 
            permit_rules['structured_rules']
        )
        
        # LLM-enhanced matching for edge cases
        llm_prompt = f"""
        Based on these project details:
        {json.dumps(classification, indent=2)}
        
        And these jurisdiction requirements:
        {json.dumps(permit_rules['structured_rules'], indent=2)}
        
        And this regulatory context:
        {permit_rules['regulatory_context']}
        
        Determine ALL required permits. Return JSON array:
        [
            {{
                "permit_type": "building|electrical|plumbing|mechanical|demolition|etc",
                "permit_name": "official name",
                "required": true|false,
                "reasoning": "why this is required",
                "triggers": ["what triggered this requirement"],
                "exemptions": ["potential exemptions if any"]
            }}
        ]
        """
        
        llm_permits = await self.llm.generate(
            prompt=llm_prompt,
            response_format='json'
        )
        
        # Merge rule-based and LLM results
        merged_permits = self.merge_permit_lists(
            rule_based_permits, 
            parse_json(llm_permits)
        )
        
        # Add metadata for each permit
        for permit in merged_permits:
            permit['form_id'] = self.get_form_id(permit, classification)
            permit['estimated_fee'] = self.get_permit_fee(permit, classification)
            permit['processing_time'] = self.get_processing_time(permit)
        
        return merged_permits
    
    def apply_rule_based_matching(self, classification, rules):
        """
        Apply deterministic rules for common scenarios
        """
        required = []
        
        for rule in rules:
            # Check if rule conditions match project
            if self.evaluate_rule_conditions(rule['conditions'], classification):
                required.append({
                    'permit_type': rule['permit_type'],
                    'permit_name': rule['permit_name'],
                    'required': True,
                    'reasoning': rule['description'],
                    'triggers': rule['triggers']
                })
        
        return required
    
    async def fetch_forms(self, required_permits, jurisdiction):
        """
        Retrieve current permit forms from municipality
        """
        forms = []
        
        for permit in required_permits:
            # Check cache first
            cached_form = await self.db.query(
                "SELECT * FROM form_templates "
                "WHERE jurisdiction_id = $1 AND permit_type = $2 "
                "AND updated_at > NOW() - INTERVAL '30 days'",
                jurisdiction['permit_authority']['id'],
                permit['permit_type']
            )
            
            if cached_form:
                form = cached_form
            else:
                # Scrape from municipality website
                form = await self.scrape_form(permit, jurisdiction)
                
                # Cache it
                await self.db.insert('form_templates', form)
            
            # Parse form structure
            form_structure = await self.parse_form_structure(form)
            
            forms.append({
                'permit_type': permit['permit_type'],
                'form_url': form['url'],
                'form_structure': form_structure,
                'fillable_pdf': form.get('pdf_url'),
                'online_portal': form.get('online_portal_url')
            })
        
        return forms
    
    async def parse_form_structure(self, form):
        """
        Extract form fields and their requirements using AI
        """
        
        if form['type'] == 'pdf':
            # Extract PDF form fields
            fields = await self.extract_pdf_fields(form['content'])
        elif form['type'] == 'html':
            # Parse HTML form
            fields = await self.extract_html_fields(form['content'])
        else:
            # Use OCR + LLM for scanned forms
            fields = await self.extract_fields_with_vision(form['content'])
        
        # Enhance with LLM understanding
        enhanced_fields = await self.llm.generate(
            prompt=f"""
            Analyze these form fields and provide structured metadata:
            {json.dumps(fields, indent=2)}
            
            For each field, return:
            {{
                "field_name": "original name",
                "field_type": "text|number|date|address|checkbox|signature|etc",
                "label": "human readable label",
                "required": bool,
                "validation_rules": ["rules for this field"],
                "help_text": "explanation of what's needed",
                "auto_fillable": bool,
                "data_source": "where we can get this data"
            }}
            """,
            response_format='json'
        )
        
        return parse_json(enhanced_fields)


# ============================================
# AUTO-FILL ENGINE
# ============================================

class AutoFillEngine:
    """
    Intelligently fills permit forms with user data
    """
    
    def __init__(self, llm_client, database):
        self.llm = llm_client
        self.db = database
    
    async def auto_fill_form(self, form_structure, user_data, project_data):
        """
        Main entry point for form auto-filling
        
        Args:
            form_structure: Parsed form fields from discovery engine
            user_data: User profile information
            project_data: Project-specific details
        
        Returns:
            Filled form with confidence scores
        """
        
        # Step 1: Map user/project data to form fields
        field_mappings = await self.create_field_mappings(
            form_structure,
            user_data,
            project_data
        )
        
        # Step 2: Fill each field with appropriate data
        filled_form = {}
        confidence_scores = {}
        missing_fields = []
        
        for field in form_structure['fields']:
            result = await self.fill_field(
                field,
                field_mappings,
                user_data,
                project_data
            )
            
            if result['value'] is not None:
                filled_form[field['field_name']] = result['value']
                confidence_scores[field['field_name']] = result['confidence']
            else:
                if field['required']:
                    missing_fields.append({
                        'field': field['field_name'],
                        'label': field['label'],
                        'help_text': field.get('help_text', '')
                    })
        
        # Step 3: Validate filled data
        validation_results = await self.validate_form(filled_form, form_structure)
        
        return {
            'filled_form': filled_form,
            'confidence_scores': confidence_scores,
            'missing_fields': missing_fields,
            'validation_results': validation_results,
            'ready_to_submit': len(missing_fields) == 0 and validation_results['valid']
        }
    
    async def create_field_mappings(self, form_structure, user_data, project_data):
        """
        Create intelligent mappings between form fields and available data
        """
        
        all_data = {
            'user': user_data,
            'project': project_data
        }
        
        prompt = f"""
        Create mappings between form fields and available data:
        
        Form fields:
        {json.dumps(form_structure['fields'], indent=2)}
        
        Available data:
        {json.dumps(all_data, indent=2)}
        
        For each form field, return the best data source:
        {{
            "field_name": {{
                "source": "user.property.address | project.description | etc",
                "transformation": "any needed transformation",
                "confidence": 0-1 score
            }}
        }}
        """
        
        mappings = await self.llm.generate(
            prompt=prompt,
            response_format='json'
        )
        
        return parse_json(mappings)
    
    async def fill_field(self, field, mappings, user_data, project_data):
        """
        Fill a single field with appropriate data
        """
        
        field_name = field['field_name']
        
        # Check if we have a mapping
        if field_name not in mappings:
            return {'value': None, 'confidence': 0}
        
        mapping = mappings[field_name]
        
        # Extract value from data source
        value = self.extract_value(mapping['source'], user_data, project_data)
        
        # Apply any transformations
        if mapping.get('transformation'):
            value = await self.apply_transformation(
                value,
                mapping['transformation'],
                field
            )
        
        # Validate against field requirements
        if not self.validate_field_value(value, field):
            # Try to use LLM to fix/convert the value
            value = await self.llm_fix_value(value, field)
        
        return {
            'value': value,
            'confidence': mapping['confidence']
        }
    
    def extract_value(self, source_path, user_data, project_data):
        """
        Extract value from nested data structure using dot notation
        """
        parts = source_path.split('.')
        
        if parts[0] == 'user':
            data = user_data
        elif parts[0] == 'project':
            data = project_data
        else:
            return None
        
        # Navigate nested structure
        for part in parts[1:]:
            if isinstance(data, dict) and part in data:
                data = data[part]
            else:
                return None
        
        return data
    
    async def apply_transformation(self, value, transformation, field):
        """
        Transform data to match field requirements
        """
        
        # Common transformations
        transformations = {
            'uppercase': lambda v: v.upper() if v else v,
            'lowercase': lambda v: v.lower() if v else v,
            'format_phone': lambda v: self.format_phone_number(v),
            'format_date': lambda v: self.format_date(v, field.get('date_format')),
            'format_currency': lambda v: f"${float(v):,.2f}" if v else None
        }
        
        if transformation in transformations:
            return transformations[transformation](value)
        
        # Complex transformations use LLM
        prompt = f"""
        Transform this value: {value}
        To meet this requirement: {transformation}
        For field: {field['label']}
        Field type: {field['field_type']}
        
        Return only the transformed value, nothing else.
        """
        
        result = await self.llm.generate(prompt=prompt)
        return result.strip()
    
    async def validate_form(self, filled_form, form_structure):
        """
        Validate entire filled form
        """
        
        errors = []
        warnings = []
        
        for field in form_structure['fields']:
            field_name = field['field_name']
            value = filled_form.get(field_name)
            
            # Check required fields
            if field['required'] and not value:
                errors.append(f"Required field missing: {field['label']}")
                continue
            
            # Validate field-specific rules
            if value and field.get('validation_rules'):
                for rule in field['validation_rules']:
                    if not self.check_validation_rule(value, rule):
                        errors.append(f"{field['label']}: {rule['message']}")
        
        # Cross-field validation using LLM
        if not errors:
            consistency_check = await self.llm.generate(
                prompt=f"""
                Review this filled permit form for consistency and completeness:
                {json.dumps(filled_form, indent=2)}
                
                Check for:
                - Inconsistent information
                - Missing relationships between fields
                - Values that don't make sense together
                
                Return JSON:
                {{
                    "valid": bool,
                    "errors": [list of errors],
                    "warnings": [list of warnings]
                }}
                """,
                response_format='json'
            )
            
            check_result = parse_json(consistency_check)
            errors.extend(check_result.get('errors', []))
            warnings.extend(check_result.get('warnings', []))
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }


# ============================================
# HELPER FUNCTIONS
# ============================================

def parse_json(text):
    """Safely parse JSON from LLM response"""
    # Remove markdown code blocks if present
    text = text.strip()
    if text.startswith('```'):
        text = text.split('\n', 1)[1]
        text = text.rsplit('```', 1)[0]
    
    return json.loads(text)


# ============================================
# USAGE EXAMPLE
# ============================================

async def main():
    """
    Example usage of the permit system
    """
    
    # Initialize engines
    llm = ClaudeClient(api_key="...")
    db = Database(connection_string="...")
    geocoder = GeocodingService()
    
    discovery = PermitDiscoveryEngine(llm, db, geocoder)
    autofill = AutoFillEngine(llm, db)
    
    # User project data
    project_data = {
        'description': 'I want to build a 12x16 foot deck attached to the back of my house, 2 feet off the ground',
        'address': '123 Main St, Austin, TX 78701',
        'project_type': 'deck_construction',
        'details': {
            'materials': 'pressure-treated wood',
            'attached': True,
            'height': 2
        }
    }
    
    # Discover required permits
    discovery_result = await discovery.discover_permits(project_data)
    
    print(f"Required permits: {len(discovery_result['permits'])}")
    for permit in discovery_result['permits']:
        print(f"  - {permit['permit_name']}: ${permit['estimated_fee']}")
    
    # Auto-fill the first form
    user_data = {
        'name': 'John Smith',
        'email': 'john@example.com',
        'phone': '512-555-1234',
        'property': {
            'address': '123 Main St',
            'city': 'Austin',
            'state': 'TX',
            'zip': '78701',
            'parcel_id': 'ABC123'
        }
    }
    
    first_form = discovery_result['forms'][0]
    filled = await autofill.auto_fill_form(
        first_form['form_structure'],
        user_data,
        project_data
    )
    
    print(f"\nForm auto-fill complete: {filled['ready_to_submit']}")
    print(f"Missing fields: {len(filled['missing_fields'])}")
    
    for missing in filled['missing_fields']:
        print(f"  - {missing['label']}: {missing['help_text']}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
