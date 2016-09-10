When making a PR please make sure that the following test cases work as expected:

| First Equation | Second Equation | First Bound | Second Bound | Axis of Rotation |
| -------------- | --------------- | ----------- | ------------ | ---------------- |
| `y=3` | `y=-x^2` | `x=-3` | `x=3` | `y=3` |
| `y=-3` | `y=-x^2` | `x=-3` | `x=3` | `y=4` |
| `y=x` | `y=x^2` | `x=1` | `x=5` | `y=0` |
| `y=x^2` | `y=x` | `x=1` | `x=5` | `y=0` |
| `y=0` | `y=x^2` | `x=0` | `x=5` | `y=0` |
| `y=x^2` | `y=0` | `x=0` | `x=5` | `y=0` |
| `y=x` | `y=x^2` | `x=0` | `x=1` | `y=0` |
| `y=x^2` | `y=x` | `x=0` | `x=1` | `y=0` |
| `(undefined)` | `y=-x^2` | `x=-3` | `x=3` | `y=3` |
| `y=-x^2` | `(undefined)` | `x=-3` | `x=3` | `y=3` |
| `y=x^2-2x` | `y=x` | `x=0` | `x=3` | `y=4` |
| `x=y` | `x=sqrt(y)` | `y=1` | `y=5` | `x=0` |
| `x=y` | `x=sqrt(y)` | `y=1` | `y=5` | `x=10` |
