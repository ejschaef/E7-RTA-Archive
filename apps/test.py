from e7_utils.filter_syntax import FilterSyntaxResolver

string = "firstpick = true;"

r = FilterSyntaxResolver(string)

print(r.as_string())