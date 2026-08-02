package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"factucheck/internal/models"
)

var (
	providersFilePath string
	fileMutex         sync.Mutex
)

func InitProviderService(dataDir string) error {
	providersFilePath = filepath.Join(dataDir, "reglas.json")
	if _, err := os.Stat(providersFilePath); os.IsNotExist(err) {
		if err := os.MkdirAll(dataDir, 0755); err != nil {
			return err
		}
		return os.WriteFile(providersFilePath, []byte("[]"), 0644)
	}
	return nil
}

func readProviders() ([]models.Provider, error) {
	fileMutex.Lock()
	defer fileMutex.Unlock()

	data, err := os.ReadFile(providersFilePath)
	if err != nil {
		if os.IsNotExist(err) {
			return []models.Provider{}, nil
		}
		return nil, err
	}

	var providers []models.Provider
	if len(data) == 0 {
		return []models.Provider{}, nil
	}

	if err := json.Unmarshal(data, &providers); err != nil {
		return nil, err
	}
	return providers, nil
}

func writeProviders(providers []models.Provider) error {
	fileMutex.Lock()
	defer fileMutex.Unlock()

	data, err := json.MarshalIndent(providers, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(providersFilePath, data, 0644)
}

func GetProviders() ([]models.Provider, error) {
	return readProviders()
}

func CreateProvider(name string, rules []models.Rule) (models.Provider, error) {
	providers, err := readProviders()
	if err != nil {
		return models.Provider{}, err
	}

	newProvider := models.Provider{
		ID:    fmt.Sprintf("%d", time.Now().UnixNano()/int64(time.Millisecond)),
		Name:  name,
		Rules: rules,
	}

	providers = append(providers, newProvider)
	if err := writeProviders(providers); err != nil {
		return models.Provider{}, err
	}

	return newProvider, nil
}

func DeleteProvider(id string) (bool, error) {
	providers, err := readProviders()
	if err != nil {
		return false, err
	}

	filtered := []models.Provider{}
	found := false
	for _, p := range providers {
		if p.ID == id {
			found = true
			continue
		}
		filtered = append(filtered, p)
	}

	if !found {
		return false, errors.New("provider not found")
	}

	if err := writeProviders(filtered); err != nil {
		return false, err
	}

	return true, nil
}

func UpdateProvider(id string, name *string, rules []models.Rule) (models.Provider, error) {
	providers, err := readProviders()
	if err != nil {
		return models.Provider{}, err
	}

	for i, p := range providers {
		if p.ID == id {
			if name != nil && *name != "" {
				providers[i].Name = *name
			}
			if rules != nil {
				providers[i].Rules = rules
			}

			if err := writeProviders(providers); err != nil {
				return models.Provider{}, err
			}
			return providers[i], nil
		}
	}

	return models.Provider{}, errors.New("provider not found")
}

func ValidateInvoice(text string, providerID string) models.ValidationResult {
	providers, err := readProviders()
	if err != nil {
		return models.ValidationResult{Success: false, Error: "Error reading providers"}
	}

	var provider *models.Provider
	for _, p := range providers {
		if p.ID == providerID {
			provider = &p
			break
		}
	}

	if provider == nil {
		return models.ValidationResult{Success: false, Error: "Provider not found"}
	}

	extractedData := make(map[string]string)
	var missingDetails []models.MissingDetail

	for _, rule := range provider.Rules {
		// ims flags mapping to Go: (?is)
		regexPattern := "(?is)" + rule.Regex
		re, err := regexp.Compile(regexPattern)
		if err != nil {
			expected := rule.Sample
			if expected == "" {
				expected = rule.Regex
			}
			missingDetails = append(missingDetails, models.MissingDetail{
				Field:    rule.Field,
				Expected: expected,
				Found:    "Error de validación (Regex inválida)",
			})
			continue
		}

		match := re.FindStringSubmatch(text)
		if len(match) > 0 {
			if len(match) > 1 && match[1] != "" {
				extractedData[rule.Field] = strings.TrimSpace(match[1])
			} else {
				extractedData[rule.Field] = strings.TrimSpace(match[0])
			}
			
			if rule.IsExchangeRate {
				extractedVal := extractedData[rule.Field]
				expectedVal := rule.Sample
				if extractedVal != expectedVal {
					missingDetails = append(missingDetails, models.MissingDetail{
						Field:    rule.Field + " (Tipo de Cambio Banguat)",
						Expected: expectedVal,
						Found:    extractedVal,
					})
					delete(extractedData, rule.Field)
				}
			}
		} else {
			expected := rule.Sample
			if expected == "" {
				expected = rule.Regex
			}
			missingDetails = append(missingDetails, models.MissingDetail{
				Field:    rule.Field,
				Expected: expected,
				Found:    "No se encontró el texto exacto en el documento",
			})
		}
	}

	if len(missingDetails) > 0 {
		return models.ValidationResult{
			Success:        false,
			Error:          fmt.Sprintf("Validación estricta falló en %d campo(s).", len(missingDetails)),
			MissingDetails: missingDetails,
			ExtractedData:  extractedData,
		}
	}

	return models.ValidationResult{
		Success:       true,
		ExtractedData: extractedData,
	}
}

func IdentifyProvider(text string) models.IdentifyResult {
	providers, err := readProviders()
	if err != nil {
		return models.IdentifyResult{}
	}

	var matchedProviderID *string

	for _, provider := range providers {
		var identifierRules []models.Rule
		for _, r := range provider.Rules {
			if r.IsIdentifier {
				identifierRules = append(identifierRules, r)
			}
		}

		if len(identifierRules) == 0 {
			continue
		}

		allMatched := true
		for _, rule := range identifierRules {
			regexPattern := "(?is)" + rule.Regex
			re, err := regexp.Compile(regexPattern)
			if err != nil || !re.MatchString(text) {
				allMatched = false
				break
			}
		}

		if allMatched {
			id := provider.ID
			matchedProviderID = &id
			break
		}
	}

	return models.IdentifyResult{ProviderID: matchedProviderID}
}
