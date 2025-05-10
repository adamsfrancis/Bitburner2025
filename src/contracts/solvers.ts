export const solvers: Record<string, (data: any) => string | number | string[] | number[]> = {};

solvers["Algorithmic Stock Trader I"] = (data: number[]): number => {
    let maxCur = 0;
    let maxSoFar = 0;
    for (let i = 1; i < data.length; ++i) {
        maxCur = Math.max(0, maxCur += data[i] - data[i - 1]);
        maxSoFar = Math.max(maxCur, maxSoFar);
    }

    return maxSoFar;
};

solvers["Algorithmic Stock Trader II"] = (data: number[]): number => {
    let profit = 0;
    for (let p = 1; p < data.length; ++p) {
        profit += Math.max(data[p] - data[p - 1], 0);
    }

    return profit;
};

solvers["Algorithmic Stock Trader III"] = (data: number[]): number => {
    let hold1 = Number.MIN_SAFE_INTEGER;
    let hold2 = Number.MIN_SAFE_INTEGER;
    let release1 = 0;
    let release2 = 0;
    for (const price of data) {
        release2 = Math.max(release2, hold2 + price);
        hold2 = Math.max(hold2, release1 - price);
        release1 = Math.max(release1, hold1 + price);
        hold1 = Math.max(hold1, price * -1);
    }

    return release2;
};
solvers["Algorithmic Stock Trader IV"] = (data: [number, number[]]): number => {
    const k = data[0];
    const prices = data[1];

    const len = prices.length;
    if (len < 2) return 0;

    if (k > len / 2) {
        let res = 0;
        for (let i = 1; i < len; ++i) {
            res += Math.max(prices[i] - prices[i - 1], 0);
        }
        return res;
    }

    const hold: number[] = new Array(k + 1).fill(Number.MIN_SAFE_INTEGER);
    const rele: number[] = new Array(k + 1).fill(0);

    for (let price of prices) {
        for (let j = k; j > 0; --j) {
            rele[j] = Math.max(rele[j], hold[j] + price);
            hold[j] = Math.max(hold[j], rele[j - 1] - price);
        }
    }

    return rele[k];
};


solvers["Array Jumping Game"] = (data) => {
    const n = data.length;
    let i = 0;
    for (let reach = 0; i < n && i <= reach; ++i) {
        reach = Math.max(i + data[i], reach);
    }
    const solution = (i === n);
    
    if (solution) {
        return 1;
    }
    else {
        return 0;
    }
};

solvers["Array Jumping Game II"] =  (data) => {
    const n = data.length;
    let reach = 0;
    let jumps = 0;
    let lastJump = -1;
    while (reach < n - 1) {
        let jumpedFrom = -1;
        for (let i = reach; i > lastJump; i--) {
            if (i + data[i] > reach) {
                reach = i + data[i];
                jumpedFrom = i;
            }
        }
        if (jumpedFrom === -1) {
            jumps = 0;
            break;
        }
        lastJump = jumpedFrom;
        jumps++;
    }
    return jumps;
};

solvers["Unique Paths in a Grid I"] = (data) => {
    const n = data[0]; // Number of rows
    const m = data[1]; // Number of columns
    const currentRow = [];
    currentRow.length = n;

    for (let i = 0; i < n; i++) {
        currentRow[i] = 1;
    }
    for (let row = 1; row < m; row++) {
        for (let i = 1; i < n; i++) {
            currentRow[i] += currentRow[i - 1];
        }
    }

    return currentRow[n - 1];
};

solvers["Merge Overlapping Intervals"] = (data: number[][]): string => {
    const intervals = data.slice();
    intervals.sort((a, b) => a[0] - b[0]);

    const result: number[][] = [];
    let start = intervals[0][0];
    let end = intervals[0][1];

    for (const interval of intervals) {
        if (interval[0] <= end) {
            end = Math.max(end, interval[1]);
        } else {
            result.push([start, end]);
            start = interval[0];
            end = interval[1];
        }
    }
    result.push([start, end]);

    return result.map(pair => `[${pair.join(",")}]`).join(",");
};


solvers["Generate IP Addresses"] = (data: string): string[] => {
    const ret: string[] = [];

    for (let a = 1; a <= 3; ++a) {
        for (let b = 1; b <= 3; ++b) {
            for (let c = 1; c <= 3; ++c) {
                for (let d = 1; d <= 3; ++d) {
                    if (a + b + c + d === data.length) {
                        const A = parseInt(data.substring(0, a), 10);
                        const B = parseInt(data.substring(a, a + b), 10);
                        const C = parseInt(data.substring(a + b, a + b + c), 10);
                        const D = parseInt(data.substring(a + b + c, a + b + c + d), 10);

                        if (
                            A <= 255 && B <= 255 && C <= 255 && D <= 255 &&
                            (a === 1 || data[0] !== '0') &&
                            (b === 1 || data[a] !== '0') &&
                            (c === 1 || data[a + b] !== '0') &&
                            (d === 1 || data[a + b + c] !== '0')
                        ) {
                            ret.push(`${A}.${B}.${C}.${D}`);
                        }
                    }
                }
            }
        }
    }

    return ret;
};

solvers["Sanitize Parentheses in Expression"] = (data: string): string[] => {
    let left = 0;
    let right = 0;
    const res: string[] = [];

    for (const char of data) {
        if (char === '(') {
            ++left;
        } else if (char === ')') {
            left > 0 ? --left : ++right;
        }
    }

    const visited = new Set<string>();

    function dfs(
        pair: number,
        index: number,
        left: number,
        right: number,
        s: string,
        solution: string
    ): void {
        if (index === s.length) {
            if (left === 0 && right === 0 && pair === 0 && !visited.has(solution)) {
                visited.add(solution);
                res.push(solution);
            }
            return;
        }

        const char = s[index];
        if (char === '(') {
            if (left > 0) {
                dfs(pair, index + 1, left - 1, right, s, solution);
            }
            dfs(pair + 1, index + 1, left, right, s, solution + char);
        } else if (char === ')') {
            if (right > 0) {
                dfs(pair, index + 1, left, right - 1, s, solution);
            }
            if (pair > 0) {
                dfs(pair - 1, index + 1, left, right, s, solution + char);
            }
        } else {
            dfs(pair, index + 1, left, right, s, solution + char);
        }
    }

    dfs(0, 0, left, right, data, "");
    return res;
};


solvers["Unique Paths in a Grid II"] = (data: number[][]): number => {
    const obstacleGrid: number[][] = data.map(row => row.slice());

    for (let i = 0; i < obstacleGrid.length; i++) {
        for (let j = 0; j < obstacleGrid[0].length; j++) {
            if (obstacleGrid[i][j] === 1) {
                obstacleGrid[i][j] = 0;
            } else if (i === 0 && j === 0) {
                obstacleGrid[0][0] = 1;
            } else {
                obstacleGrid[i][j] = 
                    (i > 0 ? obstacleGrid[i - 1][j] : 0) + 
                    (j > 0 ? obstacleGrid[i][j - 1] : 0);
            }
        }
    }

    return obstacleGrid[obstacleGrid.length - 1][obstacleGrid[0].length - 1];
};


solvers["Find Largest Prime Factor"] = (data: number): number => {
    let fac = 2;
    let n = data;
    while (n > ((fac - 1) * (fac - 1))) {
        while (n % fac === 0) {
            n = Math.round(n / fac);
        }
        ++fac;
    }

    return n === 1 ? (fac - 1) : n;
};


solvers["Subarray with Maximum Sum"] = (data: number[]): number => {
    const nums = data.slice();
    for (let i = 1; i < nums.length; i++) {
        nums[i] = Math.max(nums[i], nums[i] + nums[i - 1]);
    }

    return Math.max(...nums);
};


solvers["Total Ways to Sum"] = (data: number): number => {
    const ways = [1];
    ways.length = data + 1;
    ways.fill(0, 1);
    for (let i = 1; i < data; ++i) {
        for (let j = i; j <= data; ++j) {
            ways[j] += ways[j - i];
        }
    }

    return ways[data];
};


solvers["Total Ways to Sum II"] = (data: [number, number[]]): number => {
    const n = data[0];
    const s = data[1];
    const ways = [1];
    ways.length = n + 1;
    ways.fill(0, 1);
    for (let i = 0; i < s.length; i++) {
        for (let j = s[i]; j <= n; j++) {
            ways[j] += ways[j - s[i]];
        }
    }
    return ways[n];
};


solvers["Find All Valid Math Expressions"] = (data: [string, number]): string[] => {
    const num = data[0];
    const target = data[1];

    function helper(res: string[], path: string, num: string, target: number, pos: number, evaluated: number, multed: number): void {
        if (pos === num.length) {
            if (target === evaluated) {
                res.push(path);
            }
            return;
        }

        for (let i = pos; i < num.length; ++i) {
            if (i !== pos && num[pos] === '0') { break; }
            const cur = parseInt(num.substring(pos, i + 1));

            if (pos === 0) {
                helper(res, path + cur, num, target, i + 1, cur, cur);
            } else {
                helper(res, path + "+" + cur, num, target, i + 1, evaluated + cur, cur);
                helper(res, path + "-" + cur, num, target, i + 1, evaluated - cur, -cur);
                helper(res, path + "*" + cur, num, target, i + 1, evaluated - multed + multed * cur, multed * cur);
            }
        }
    }

    const result: string[] = [];
    helper(result, "", num, target, 0, 0, 0);

    return result;
};


solvers["Spiralize Matrix"] = (data: number[][]): number[] => {
    const spiral: number[] = [];
    const m = data.length;
    const n = data[0].length;
    let u = 0;
    let d = m - 1;
    let l = 0;
    let r = n - 1;
    let k = 0;
    while (true) {
        // Up
        for (let col = l; col <= r; col++) {
            spiral[k] = data[u][col];
            ++k;
        }
        if (++u > d) { break; }

        // Right
        for (let row = u; row <= d; row++) {
            spiral[k] = data[row][r];
            ++k;
        }
        if (--r < l) { break; }

        // Down
        for (let col = r; col >= l; col--) {
            spiral[k] = data[d][col];
            ++k;
        }
        if (--d < u) { break; }

        // Left
        for (let row = d; row >= u; row--) {
            spiral[k] = data[row][l];
            ++k;
        }
        if (++l > r) { break; }
    }
    return spiral;
};


solvers["Minimum Path Sum in a Triangle"] = (data: number[][]): number => {
    const n = data.length;
    const dp = data[n - 1].slice(); // Copy the last row into dp array
    for (let i = n - 2; i >= 0; --i) {
        for (let j = 0; j < data[i].length; ++j) {
            dp[j] = Math.min(dp[j], dp[j + 1]) + data[i][j];
        }
    }

    return dp[0];
};


solvers["Shortest Path in a Grid"] = (data: number[][]): string => {
    function findWay(position: number[], end: number[], data: number[][]): number[][] | null {
        const queue: number[][][] = []; // queue stores paths, each path is an array of positions

        data[position[0]][position[1]] = 1; // mark start as visited
        queue.push([position]); // add the starting position to the queue

        while (queue.length > 0) {
            const path = queue.shift()!; // get the path out of the queue (non-null assertion because queue is not empty)
            const pos = path[path.length - 1]; // get the last position from the path
            const direction = [
                [pos[0] + 1, pos[1]], // Down
                [pos[0], pos[1] + 1], // Right
                [pos[0] - 1, pos[1]], // Up
                [pos[0], pos[1] - 1]  // Left
            ];

            for (let i = 0; i < direction.length; i++) {
                // Check if the current direction reaches the end
                if (direction[i][0] === end[0] && direction[i][1] === end[1]) {
                    return path.concat([end]); // return the path that led to the end
                }

                // Skip invalid positions
                if (direction[i][0] < 0 || direction[i][0] >= data.length ||
                    direction[i][1] < 0 || direction[i][1] >= data[0].length ||
                    data[direction[i][0]][direction[i][1]] !== 0) {
                    continue;
                }

                data[direction[i][0]][direction[i][1]] = 1; // mark the position as visited
                queue.push(path.concat([direction[i]])); // extend the path and add it to the queue
            }
        }
        return null; // if no path is found
    }

    function annotate(path: number[][]): string {
        let currentPosition = [0, 0];
        let iteration = '';

        // Start at the 2nd element of the path
        for (let i = 1; i < path.length; i++) {
            if (currentPosition[0] < path[i][0]) iteration += 'D'; // Move Down
            if (currentPosition[0] > path[i][0]) iteration += 'U'; // Move Up

            if (currentPosition[1] < path[i][1]) iteration += 'R'; // Move Right
            if (currentPosition[1] > path[i][1]) iteration += 'L'; // Move Left

            currentPosition = path[i];
        }

        return iteration;
    }

    const path = findWay([0, 0], [data.length - 1, data[0].length - 1], data);
    if (path) return annotate(path);
    return "";
};


solvers["HammingCodes: Integer to Encoded Binary"] = (value: number): string => {
    // encoding following Hamming's rule
    function HammingSumOfParity(_lengthOfDBits: number): number {
        // will calculate the needed amount of parity bits 'without' the "overall"-Parity
        return _lengthOfDBits < 3 || _lengthOfDBits === 0
            ? _lengthOfDBits === 0
                ? 0
                : _lengthOfDBits + 1
            : Math.ceil(Math.log2(_lengthOfDBits * 2)) <=
                Math.ceil(Math.log2(1 + _lengthOfDBits + Math.ceil(Math.log2(_lengthOfDBits))))
            ? Math.ceil(Math.log2(_lengthOfDBits) + 1)
            : Math.ceil(Math.log2(_lengthOfDBits));
    }

    const _data = value.toString(2).split(""); // Convert to binary string, then split into array of bits
    const _sumParity = HammingSumOfParity(_data.length); // Get the sum of needed parity bits
    const count = (arr: string[], val: string): number => arr.reduce((a, v) => (v === val ? a + 1 : a), 0); // Count specific values in the array

    const _build: string[] = ["x", "x", ..._data.splice(0, 1)]; // Initialize the "pre-build" array

    for (let i = 2; i < _sumParity; i++) {
        // Add new parity bits and corresponding data bits
        _build.push("x", ..._data.splice(0, Math.pow(2, i) - 1));
    }

    // Now calculate the parity bits ('x')
    for (const index of _build.reduce(function (a, e, i) {
        if (e === "x") a.push(i);
        return a;
    }, [] as number[])) {
        // Generate the array of indices where the "x" is placed
        const _tempcount = index + 1; // Set the "stepsize" for the parityBit
        const _temparray: string[] = []; // Temporary array to store extracted bits
        const _tempdata: string[] = [..._build]; // Work with a copy of the _build array
        while (_tempdata[index] !== undefined) {
            // As long as there are bits at the starting index, cut
            const _temp = _tempdata.splice(index, _tempcount * 2); // Cut stepsize * 2 bits
            _temparray.push(..._temp.splice(0, _tempcount)); // Keep the first half
        }
        _temparray.splice(0, 1); // Remove the first bit, which is the parity one
        _build[index] = (count(_temparray, "1") % 2).toString(); // Store the parity bit as 0 or 1
    }

    // Set the overall parity
    _build.unshift((count(_build, "1") % 2).toString()); // The overall parity bit

    return _build.join(""); // Return the encoded binary string
};


solvers["HammingCodes: Encoded Binary to Integer"] = (_data: string): number => {
    // Check for altered bit and decode
    const _build = _data.split(""); // Convert string to array of characters (bits)
    const _testArray: boolean[] = []; // For the "truth table". If any is false, the data has an altered bit.
    const _sumParity = Math.ceil(Math.log2(_data.length)); // Calculate the sum of parity bits
    const count = (arr: string[], val: string): number =>
        arr.reduce((a, v) => (v === val ? a + 1 : a), 0); // Count occurrences of specific value
    
    let _overallParity = _build.splice(0, 1).join(""); // Store the first index (overall parity)
    _testArray.push(_overallParity === (count(_build, "1") % 2).toString()); // First check with the overall parity bit
    
    for (let i = 0; i < _sumParity; i++) {
        // For the remaining parity bits, check their validity
        const _tempIndex = Math.pow(2, i) - 1; // Get the index of the parity bit
        const _tempStep = _tempIndex + 1; // Set the step size
        const _tempData = [..._build]; // Create a copy of the build data
        const _tempArray: string[] = []; // Initialize an empty array for testing
        
        while (_tempData[_tempIndex] !== undefined) {
            // Extract data until the starting index is undefined
            const _temp = [..._tempData.splice(_tempIndex, _tempStep * 2)]; // Extract 2 * stepsize bits
            _tempArray.push(..._temp.splice(0, _tempStep)); // Keep the first half
        }
        
        const _tempParity = _tempArray.shift(); // Save the first index for checking
        _testArray.push(_tempParity === (count(_tempArray, "1") % 2).toString());
        // Check if the parity bit matches the calculated value and store result in the truth table
    }
    
    let _fixIndex = 0; // Initialize the "fixing" index
    for (let i = 1; i < _sumParity + 1; i++) {
        // Binary addition for each boolean in the _testArray, starting from the second index
        _fixIndex += _testArray[i] ? 0 : Math.pow(2, i) / 2;
    }
    
    _build.unshift(_overallParity); // Place the overall parity back
    // Try fixing the actual encoded binary string if there is an error
    if (_fixIndex > 0 && !_testArray[0]) {
        // If the overall parity is incorrect and the sum of calculated values is greater than or equal to 0, fix the corresponding Hamming bit
        _build[_fixIndex] = _build[_fixIndex] === "0" ? "1" : "0";
    } else if (!_testArray[0]) {
        // If only the overall parity is wrong, fix it
        _overallParity = _overallParity === "0" ? "1" : "0";
    } else if (_testArray[0] && _testArray.some((truth) => !truth)) {
        return 0; // Two bits are altered, which should not happen
    }
    
    // Remove the parity bits from the _build array
    for (let i = _sumParity; i >= 0; i--) {
        _build.splice(Math.pow(2, i), 1);
    }
    
    _build.splice(0, 1); // Remove the overall parity bit, and we're left with the data bits
    return parseInt(_build.join(""), 2); // Parse the binary value to an integer and return it
};


solvers["Proper 2-Coloring of a Graph"] = ([N, edges]: [number, [number, number][]]): number[] => {
    // Helper function to get neighbourhood of a vertex
    function neighbourhood(vertex: number): number[] {
        const adjLeft = edges.filter(([a, _]) => a === vertex).map(([_, b]) => b);
        const adjRight = edges.filter(([_, b]) => b === vertex).map(([a, _]) => a);
        return adjLeft.concat(adjRight);
    }

    const coloring: (number | undefined)[] = Array(N).fill(undefined);
    while (coloring.some((val) => val === undefined)) {
        // Color a vertex in the graph
        const initialVertex = coloring.findIndex((val) => val === undefined);
        coloring[initialVertex] = 0;
        const frontier: number[] = [initialVertex];

        // Propagate the coloring throughout the component containing v greedily
        while (frontier.length > 0) {
            const v = frontier.pop() || 0;
            const neighbors = neighbourhood(v);

            // For each vertex u adjacent to v
            for (const id in neighbors) {
                const u = neighbors[id];

                // Set the color of u to the opposite of v's color if it is new,
                // then add u to the frontier to continue the algorithm.
                if (coloring[u] === undefined) {
                    coloring[u] = coloring[v] === 0 ? 1 : 0;
                    frontier.push(u);
                }

                // Assert u,v do not have the same color
                else if (coloring[u] === coloring[v]) {
                    // If u,v do have the same color, no proper 2-coloring exists
                    return [];
                }
            }
        }
    }

    // If this code is reached, there exists a proper 2-coloring of the input graph.
    return coloring as number[];
};


solvers["Compression I: RLE Compression"] = (data: string): string => {
    // get the first character
    let pos = 0;
    let i = 1;
    const length = data.length;
    let compression = "";

    // go through each letter
    while (pos < length) {            
        // Check each letter to see if it matches the next
        if (data.charAt(pos) === data.charAt(pos + 1)) {
            // add a position increase for that letter
            i++;
        } else {
            // check if there are more than 9 iterations
            if (i > 9) {
                // How many 9's
                const split = Math.floor(i / 9);
                for (let n = 0; n < split; n++) {
                    compression += "9" + data.charAt(pos);
                }
                // Add the remaining number left
                compression += (i - (split * 9)) + data.charAt(pos);
            } else {
                // if the next letter doesn't match then we need to write out to the compression string
                compression += i + data.charAt(pos);
            }
            i = 1;
        }
        pos++;
    }
    return compression;
};
