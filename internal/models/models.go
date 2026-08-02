package models

type Rule struct {
	Field          string `json:"field"`
	Regex          string `json:"regex"`
	IsIdentifier   bool   `json:"isIdentifier,omitempty"`
	IsExchangeRate bool   `json:"isExchangeRate,omitempty"`
	Sample         string `json:"sample,omitempty"`
}

type Provider struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Rules []Rule `json:"rules"`
}

type MissingDetail struct {
	Field    string `json:"field"`
	Expected string `json:"expected"`
	Found    string `json:"found"`
}

type ValidationResult struct {
	Success        bool              `json:"success"`
	Error          string            `json:"error,omitempty"`
	MissingDetails []MissingDetail   `json:"missingDetails,omitempty"`
	ExtractedData  map[string]string `json:"extractedData,omitempty"`
}

type IdentifyResult struct {
	ProviderID *string `json:"providerId"`
}
