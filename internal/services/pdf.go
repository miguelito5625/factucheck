package services

import (
	"bytes"
	"io"

	"github.com/ledongthuc/pdf"
)

func ParsePdf(fileData []byte) (string, error) {
	reader, err := pdf.NewReader(bytes.NewReader(fileData), int64(len(fileData)))
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	b, err := reader.GetPlainText()
	if err != nil {
		return "", err
	}
	
	_, err = io.Copy(&buf, b)
	if err != nil {
		return "", err
	}

	return buf.String(), nil
}
