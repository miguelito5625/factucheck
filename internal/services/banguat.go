package services

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"
)

var currentBanguatRate string
var banguatDateStr string

// GetCurrentBanguatRate returns the cached exchange rate and the date it applies to.
func GetCurrentBanguatRate() (string, string) {
	return currentBanguatRate, banguatDateStr
}

func GetLastDayOfPreviousMonth() string {
	now := time.Now()
	firstDayOfCurrentMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastDayOfPrevMonth := firstDayOfCurrentMonth.AddDate(0, 0, -1)
	return lastDayOfPrevMonth.Format("02/01/2006")
}

// FetchBanguatExchangeRate fetches the exchange rate from Banguat SOAP service.
func FetchBanguatExchangeRate(dateStr string) (string, error) {
	url := "https://www.banguat.gob.gt/variables/ws/TipoCambio.asmx"
	soapEnvelope := fmt.Sprintf(`<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TipoCambioFechaInicial xmlns="http://www.banguat.gob.gt/variables/ws/">
      <fechainit>%s</fechainit>
    </TipoCambioFechaInicial>
  </soap:Body>
</soap:Envelope>`, dateStr)

	req, err := http.NewRequest("POST", url, bytes.NewBufferString(soapEnvelope))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "text/xml; charset=utf-8")
	req.Header.Set("SOAPAction", "http://www.banguat.gob.gt/variables/ws/TipoCambioFechaInicial")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	bodyStr := string(bodyBytes)

	// Extract the <venta> element
	re := regexp.MustCompile(`<venta>([^<]+)</venta>`)
	matches := re.FindStringSubmatch(bodyStr)
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1]), nil
	}

	return "", fmt.Errorf("could not find <venta> element in response")
}

// UpdateExchangeRates updates all rules in the system that have IsExchangeRate = true
func UpdateExchangeRates() {
	dateStr := GetLastDayOfPreviousMonth()
	rate, err := FetchBanguatExchangeRate(dateStr)
	if err != nil {
		log.Printf("Failed to fetch official exchange rate from Banguat: %v\n", err)
		return
	}

	currentBanguatRate = rate
	banguatDateStr = dateStr
	log.Printf("Fetched official exchange rate for %s: %s\n", dateStr, rate)

	providers, err := readProviders()
	if err != nil {
		log.Printf("Failed to read providers to update exchange rates: %v\n", err)
		return
	}

	updated := false
	for i := range providers {
		for j := range providers[i].Rules {
			if providers[i].Rules[j].IsExchangeRate {
				if providers[i].Rules[j].Sample != rate {
					providers[i].Rules[j].Sample = rate
					updated = true
				}
			}
		}
	}

	if updated {
		if err := writeProviders(providers); err != nil {
			log.Printf("Failed to write updated providers: %v\n", err)
		} else {
			log.Println("Successfully updated default exchange rates in all providers.")
		}
	}
}
