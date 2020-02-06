package main

import (
	"encoding/base64"
	"syscall/js"

	"github.com/360EntSecGroup-Skylar/excelize"
)

type format struct {
}

func excel(this js.Value, i []js.Value) interface{} {
	//categories := map[string]string{"A2": "Small", "A3": "Normal", "A4": "Large", "B1": "Apple", "C1": "Orange", "D1": "Pear"}
	//values := map[string]int{"B2": 2, "C2": 3, "D2": 3, "B3": 5, "C3": 2, "D3": 4, "B4": 6, "C4": 7, "D4": 8}

	f := excelize.NewFile()

	length := i[0].Length()
	args := i[0]
	for n := 0; n < length; n++ {
		chart := args.Index(n)
		if f.GetSheetIndex(chart.Index(0).String()) == 0 {
			f.NewSheet(chart.Index(0).String())
		}	
		
		//println(chart.Index(2).String())
		err := f.AddChart(chart.Index(0).String(), chart.Index(1).String(), chart.Index(2).String())
		if err != nil {
			println(err.Error())
		}
	}

	/*err := f.AddChart("Sheet1", "E1", `{"type":"col","series":[{"name":"\"A\"","categories":"D","values":"{2,3,4}"},{"name":"B","categories":"E","values":"{4,5,6}"},{"name":"C","categories":"F","values":"{7,8,9}"}],"title":{"name":"Fruit 3D Clustered Column Chart"}}`)
	if err != nil {
		println(err.Error())
	}*/
	fileBuffer, _ := f.WriteToBuffer()

	//println(i[0].Type().String())
	//println(i[0].Index(0).Index(0).String())
	return base64.StdEncoding.EncodeToString(fileBuffer.Bytes())
	//return js.TypedArrayOf([]string{"haha", "hehe"})
}

func registerCallback() {
	js.Global().Set("excel", js.FuncOf(excel))
}
func main() {
	c := make(chan struct{}, 0)
	registerCallback()
	<-c
}
