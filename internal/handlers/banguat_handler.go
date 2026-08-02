package handlers

import (
	"net/http"

	"factucheck/internal/services"
	"github.com/gin-gonic/gin"
)

func GetExchangeRate(c *gin.Context) {
	rate, dateStr := services.GetCurrentBanguatRate()
	if rate == "" {
		// Try fetching directly if not cached
		dateStr = services.GetLastDayOfPreviousMonth()
		fetchedRate, err := services.FetchBanguatExchangeRate(dateStr)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch exchange rate"})
			return
		}
		rate = fetchedRate
	}

	c.JSON(http.StatusOK, gin.H{
		"rate": rate,
		"date": dateStr,
	})
}

func RefreshExchangeRate(c *gin.Context) {
	services.UpdateExchangeRates()
	rate, dateStr := services.GetCurrentBanguatRate()
	c.JSON(http.StatusOK, gin.H{
		"rate": rate,
		"date": dateStr,
	})
}
