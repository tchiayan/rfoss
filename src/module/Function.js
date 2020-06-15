const pivot = (data, key, category, val, filter = []) => {
    // filter data 
    if(filter.length > 0){
        data = data.filter(row => filter.includes(row[category]))
    }

    const _key = typeof key === 'string' ? Array.from(new Set(data.map(row => row[key]))) : key
    const _cat = typeof category === 'string' ? Array.from(new Set(data.map(row => row[category]))) : category
    //console.log(_cat)
    // Dimension  = _key + 1 x _cat [ row  * column]
    let table = (new Array(_key.length+1))
    for(let i=0; i < table.length; i++){
      if(i === 0){
        table[i] = [typeof key !== 'string' ? 'key' : key, ..._cat ]
      }else{
        table[i] = (new Array(_cat.length + 1)).fill(null)
        table[i][0] = _key[i-1]
      }
    }
    // Allocate Value 
    for(let i=0; i < data.length ; i ++){
        const rowIndex = _key.indexOf(data[i][typeof key !== 'string' ? 'key' : key])
        if(typeof category === 'string'){
            const columnIndex = _cat.indexOf(data[i][category])
            if(rowIndex !== -1 && columnIndex !== -1){
                table[rowIndex+1][columnIndex+1] = data[i][val]
            }
        }else{
            for(let j=0 ; j < _cat.length ;  j++){
                table[rowIndex+1][j+1] = data[i][_cat[j]]
            }
        }
    }
    return table
}

export {
    pivot
}
