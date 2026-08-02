package services

import (
	"regexp"
	"strings"
)

var timeRegex = regexp.MustCompile(`\d:\d`)

func AnalyzeHeuristics(text string) map[string]string {
	results := make(map[string]string)
	lines := strings.Split(text, "\n")
	var currentField *string

	for _, rawLine := range lines {
		line := strings.TrimSpace(rawLine)
		if line == "" {
			currentField = nil
			continue
		}

		colonIndex := strings.Index(line, ":")
		isNewField := false

		if colonIndex != -1 {
			isTime := false
			if colonIndex-1 >= 0 && colonIndex+2 <= len(line) {
				isTime = timeRegex.MatchString(line[colonIndex-1 : colonIndex+2])
			}

			isUrl := false
			if colonIndex+3 <= len(line) {
				isUrl = line[colonIndex:colonIndex+3] == "://"
			}

			if !isTime && !isUrl {
				isNewField = true
			}
		}

		if isNewField {
			fieldName := strings.TrimSpace(line[:colonIndex])
			value := ""
			if colonIndex+1 < len(line) {
				value = strings.TrimSpace(line[colonIndex+1:])
			}

			if len(fieldName) > 0 && len(fieldName) < 60 {
				fName := fieldName
				currentField = &fName
				results[*currentField] = value
			} else if currentField != nil {
				if results[*currentField] == "" {
					results[*currentField] = line
				} else {
					currentField = nil
				}
			}
		} else {
			if currentField != nil {
				if results[*currentField] == "" {
					results[*currentField] = line
				} else {
					currentField = nil
				}
			}
		}
	}

	return results
}
